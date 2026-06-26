"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeMerchant } from "@/lib/categorize";
import { parseAmount } from "@/lib/format";
import { generateToken, hashToken } from "@/lib/token";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

// Cuando el usuario asocia comercio + categoría, la app lo recuerda
// para que el próximo gasto de ese comercio caiga solo en su categoría.
async function learnRule(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  merchant: string | null,
  categoryId: string | null
) {
  if (!merchant || !categoryId) return;
  const normalized = normalizeMerchant(merchant);
  if (!normalized) return;
  await supabase
    .from("merchant_rules")
    .upsert(
      { user_id: userId, merchant_normalized: normalized, category_id: categoryId },
      { onConflict: "user_id,merchant_normalized" }
    );
}

// El nombre que se ve en los viajes se copia al unirte; si luego lo cambias
// en la app hay que refrescarlo en todas tus filas de viaje (las tuyas como
// persona y como miembro) para que los demás te vean con tu nombre nuevo.
// Usa la service-role key: trip_members no tiene política de UPDATE y el
// nombre debe quedar visible para el resto del bote.
async function syncTripName(userId: string, name: string, email?: string | null) {
  const effective = name.trim() || (email ?? "").split("@")[0]?.trim() || "Miembro";
  const admin = createAdminClient();
  await Promise.all([
    admin.from("trip_people").update({ name: effective }).eq("user_id", userId),
    admin.from("trip_members").update({ display_name: effective }).eq("user_id", userId),
  ]);
}

export async function addExpense(formData: FormData) {
  const { supabase, user } = await requireUser();

  const amount = parseAmount(formData.get("amount"));
  if (amount === null) return;

  const merchant = String(formData.get("merchant") ?? "").trim() || null;
  const categoryId = String(formData.get("category_id") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("default_currency")
    .eq("id", user.id)
    .maybeSingle();

  const { error } = await supabase.from("expenses").insert({
    user_id: user.id,
    amount,
    currency: profile?.default_currency ?? "MXN",
    merchant,
    category_id: categoryId,
    source: "manual",
    note,
  });
  if (error) return;

  await learnRule(supabase, user.id, merchant, categoryId);
  revalidatePath("/", "layout");
  redirect("/gastos");
}

export async function updateExpense(formData: FormData) {
  const { supabase, user } = await requireUser();

  const id = String(formData.get("id") ?? "");
  const amount = parseAmount(formData.get("amount"));
  if (!id || amount === null) return;

  const merchant = String(formData.get("merchant") ?? "").trim() || null;
  const categoryId = String(formData.get("category_id") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;
  const occurredAt = String(formData.get("occurred_at") ?? "").trim();

  const update: Record<string, unknown> = {
    amount,
    merchant,
    category_id: categoryId,
    note,
  };
  if (occurredAt) {
    const parsed = new Date(occurredAt);
    if (!Number.isNaN(parsed.getTime())) update.occurred_at = parsed.toISOString();
  }

  const { error } = await supabase
    .from("expenses")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return;

  await learnRule(supabase, user.id, merchant, categoryId);
  revalidatePath("/", "layout");
  redirect("/gastos");
}

export async function deleteExpense(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (id) {
    await supabase.from("expenses").delete().eq("id", id).eq("user_id", user.id);
  }
  revalidatePath("/", "layout");
  redirect("/gastos");
}

// Guarda solo el nombre (para el aviso "¿Cómo te llamas?" y el alta).
export async function setDisplayName(formData: FormData) {
  const { supabase, user } = await requireUser();
  const name = String(formData.get("display_name") ?? "").trim();
  if (!name) return;
  await supabase.from("profiles").update({ display_name: name }).eq("id", user.id);
  await syncTripName(user.id, name, user.email);
  revalidatePath("/", "layout");
}

export async function updateProfile(formData: FormData) {
  const { supabase, user } = await requireUser();
  const displayName = String(formData.get("display_name") ?? "").trim() || null;
  const currency = String(formData.get("default_currency") ?? "MXN").trim().toUpperCase();

  // El presupuesto es opcional; vacío = sin presupuesto.
  const budgetRaw = parseAmount(formData.get("monthly_budget"));
  const monthlyBudget =
    String(formData.get("monthly_budget") ?? "").trim() === "" ? null : budgetRaw;

  // El ingreso también es opcional; vacío = no se muestra el "disponible".
  const incomeRaw = parseAmount(formData.get("monthly_income"));
  const monthlyIncome =
    String(formData.get("monthly_income") ?? "").trim() === "" ? null : incomeRaw;

  // Intentamos guardar con presupuesto + ingreso. Si alguna columna aún no existe
  // (migración pendiente), reintentamos sin ellas para no romper el guardado.
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      default_currency: currency,
      monthly_budget: monthlyBudget,
      monthly_income: monthlyIncome,
    })
    .eq("id", user.id);
  if (error) {
    await supabase
      .from("profiles")
      .update({ display_name: displayName, default_currency: currency })
      .eq("id", user.id);
  }
  await syncTripName(user.id, displayName ?? "", user.email);
  revalidatePath("/", "layout");
}

// ── Pagos fijos: suscripciones, compras a meses y recordatorio de tarjeta ──

export async function addRecurringPayment(formData: FormData) {
  const { supabase, user } = await requireUser();
  const kind = String(formData.get("kind") ?? "");
  if (!["subscription", "installment", "card"].includes(kind)) return;

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const day = Math.min(Math.max(parseInt(String(formData.get("day_of_month") ?? "1"), 10) || 1, 1), 31);
  const amount = parseAmount(formData.get("amount")); // null = sin monto (válido en tarjeta)
  const categoryId = String(formData.get("category_id") ?? "").trim() || null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("default_currency")
    .eq("id", user.id)
    .maybeSingle();

  const color = String(formData.get("color") ?? "").trim() || null;
  const row: Record<string, unknown> = {
    user_id: user.id,
    kind,
    name,
    amount,
    currency: profile?.default_currency ?? "MXN",
    day_of_month: day,
    category_id: categoryId,
    color,
  };

  if (kind === "installment") {
    const totalMonths = parseInt(String(formData.get("total_months") ?? ""), 10);
    if (Number.isFinite(totalMonths) && totalMonths > 0) row.total_months = totalMonths;
    const startDate = String(formData.get("start_date") ?? "").trim();
    row.start_date = startDate || new Date().toISOString().slice(0, 10);
  }

  // Si la columna color aún no existe (migración 0007 pendiente), reintenta sin ella.
  const { error } = await supabase.from("recurring_payments").insert(row);
  if (error) {
    delete row.color;
    await supabase.from("recurring_payments").insert(row);
  }
  revalidatePath("/", "layout");
  redirect("/fijos");
}

export async function deleteRecurringPayment(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (id) {
    await supabase.from("recurring_payments").delete().eq("id", id).eq("user_id", user.id);
  }
  revalidatePath("/", "layout");
  redirect("/fijos");
}

export async function addCategory(formData: FormData) {
  const { supabase, user } = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const icon = String(formData.get("icon") ?? "").trim() || "🏷️";
  const color = String(formData.get("color") ?? "").trim() || null;
  if (!name) return;
  // Si la columna color aún no existe (migración 0007 pendiente), reintenta sin ella.
  const { error } = await supabase.from("categories").insert({ user_id: user.id, name, icon, color });
  if (error) {
    await supabase.from("categories").insert({ user_id: user.id, name, icon });
  }
  revalidatePath("/", "layout");
}

export async function deleteCategory(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (id) {
    await supabase.from("categories").delete().eq("id", id).eq("user_id", user.id);
  }
  revalidatePath("/", "layout");
}

// Crea (o reemplaza) el token personal para los Atajos del iPhone.
// Devuelve el texto plano UNA sola vez; en la BD queda solo el hash.
export async function createToken(): Promise<{ token?: string; error?: string }> {
  const { supabase, user } = await requireUser();

  const token = generateToken();
  await supabase.from("api_tokens").delete().eq("user_id", user.id);
  const { error } = await supabase.from("api_tokens").insert({
    user_id: user.id,
    token_hash: hashToken(token),
    label: "iPhone",
  });
  if (error) return { error: "No se pudo crear el token." };

  revalidatePath("/ajustes");
  return { token };
}

export async function revokeToken() {
  const { supabase, user } = await requireUser();
  await supabase.from("api_tokens").delete().eq("user_id", user.id);
  revalidatePath("/ajustes");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
