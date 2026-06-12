import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/token";
import { parseAmount } from "@/lib/format";
import { categorize, normalizeMerchant } from "@/lib/categorize";

// Webhook que reciben los Atajos del iPhone (Apple Pay / Siri).
// Auth: header "Authorization: Bearer <token personal>".

export async function GET() {
  return NextResponse.json({ ok: true, service: "gastos" });
}

export async function POST(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) {
    return NextResponse.json({ ok: false, error: "Falta el token" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: apiToken } = await supabase
    .from("api_tokens")
    .select("id, user_id")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  if (!apiToken) {
    return NextResponse.json({ ok: false, error: "Token inválido" }, { status: 401 });
  }

  // Aceptamos los datos por donde vengan, para que el Atajo del iPhone sea
  // simple: query params en la URL (?amount=...), cuerpo JSON, o formulario.
  const body: Record<string, unknown> = {};

  // 1) Query params de la URL
  const url = new URL(request.url);
  url.searchParams.forEach((value, key) => {
    body[key] = value;
  });

  // 2) Cuerpo de la petición (JSON o form-urlencoded), si trae algo
  const contentType = request.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      const json = await request.json();
      if (json && typeof json === "object") Object.assign(body, json);
    } else if (
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data")
    ) {
      const form = await request.formData();
      form.forEach((value, key) => {
        body[key] = value;
      });
    } else {
      // Sin content-type claro: intenta JSON, pero no falles si no lo es.
      const text = await request.text();
      if (text.trim()) {
        try {
          const json = JSON.parse(text);
          if (json && typeof json === "object") Object.assign(body, json);
        } catch {
          // ignora: probablemente los datos venían en la URL
        }
      }
    }
  } catch {
    // Cuerpo ilegible: seguimos con lo que haya en la URL
  }

  const amount = parseAmount(body.amount);
  if (amount === null) {
    return NextResponse.json(
      { ok: false, error: "Falta 'amount' o no es un monto válido" },
      { status: 400 }
    );
  }

  const merchant =
    typeof body.merchant === "string" && body.merchant.trim()
      ? body.merchant.trim()
      : null;

  const source =
    typeof body.source === "string" && ["applepay", "manual", "siri"].includes(body.source)
      ? body.source
      : "manual";

  let occurredAt = new Date();
  if (typeof body.occurred_at === "string") {
    const parsed = new Date(body.occurred_at);
    if (!Number.isNaN(parsed.getTime())) occurredAt = parsed;
  }

  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;

  const userId = apiToken.user_id;

  let currency = typeof body.currency === "string" && body.currency.trim()
    ? body.currency.trim().toUpperCase()
    : null;
  if (!currency) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("default_currency")
      .eq("id", userId)
      .maybeSingle();
    currency = profile?.default_currency ?? "MXN";
  }

  // Idempotencia: Atajos a veces dispara la automatización dos veces.
  // Bucket de 2 minutos para que el reintento genere la misma llave.
  const bucket = Math.floor(occurredAt.getTime() / 120_000);
  const dedupeKey =
    typeof body.idempotency_key === "string" && body.idempotency_key.trim()
      ? body.idempotency_key.trim()
      : createHash("sha256")
          .update(`${userId}|${amount}|${merchant ? normalizeMerchant(merchant) : ""}|${bucket}`)
          .digest("hex");

  const categoryId = await categorize(supabase, userId, merchant);

  const { data: expense, error } = await supabase
    .from("expenses")
    .upsert(
      {
        user_id: userId,
        amount,
        currency,
        merchant,
        category_id: categoryId,
        source,
        occurred_at: occurredAt.toISOString(),
        note,
        dedupe_key: dedupeKey,
      },
      { onConflict: "user_id,dedupe_key", ignoreDuplicates: true }
    )
    .select("id, amount, currency, merchant, occurred_at")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // upsert con ignoreDuplicates devuelve null cuando ya existía
  if (!expense) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  await supabase
    .from("api_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", apiToken.id);

  let categoryName: string | null = null;
  if (categoryId) {
    const { data: category } = await supabase
      .from("categories")
      .select("name")
      .eq("id", categoryId)
      .maybeSingle();
    categoryName = category?.name ?? null;
  }

  return NextResponse.json(
    {
      ok: true,
      expense,
      category: categoryName ?? "Sin categoría",
      message: `Gasto registrado: $${amount}${merchant ? ` en ${merchant}` : ""} → ${categoryName ?? "Sin categoría"}`,
    },
    { status: 201 }
  );
}
