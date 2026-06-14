import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveMonth } from "@/lib/months";

function esc(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  // RFC 4180: wrap in quotes if value contains comma, quote, or newline
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const mes = req.nextUrl.searchParams.get("mes") ?? undefined;
  const { year, month, start, end } = resolveMonth(mes);

  const { data } = await supabase
    .from("expenses")
    .select("amount, currency, merchant, occurred_at, source, note, categories(name)")
    .gte("occurred_at", start.toISOString())
    .lt("occurred_at", end.toISOString())
    .order("occurred_at", { ascending: true });

  const rows = (data ?? []) as unknown as {
    amount: number;
    currency: string;
    merchant: string | null;
    occurred_at: string;
    source: string;
    note: string | null;
    categories: { name: string } | null;
  }[];

  const header = ["Fecha", "Hora", "Comercio", "Categoría", "Monto", "Moneda", "Fuente", "Nota"];
  const lines = [header.map(esc).join(",")];

  for (const e of rows) {
    const d = new Date(e.occurred_at);
    const fecha = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    const hora = `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
    const fuente = e.source === "applepay" ? "Apple Pay" : e.source === "siri" ? "Siri" : e.source === "manual" ? "Manual" : e.source;
    lines.push([
      esc(fecha),
      esc(hora),
      esc(e.merchant),
      esc(e.categories?.name),
      esc(Number(e.amount).toFixed(2)),
      esc(e.currency),
      esc(fuente),
      esc(e.note),
    ].join(","));
  }

  const csv = lines.join("\r\n");
  const filename = `gastos-${year}-${String(month).padStart(2, "0")}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
