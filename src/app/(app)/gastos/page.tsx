import { createClient } from "@/lib/supabase/server";
import { dayKey, formatDayLabel } from "@/lib/format";
import { categoryColor } from "@/lib/category-style";
import { GastosPeriodView, type GastoItem } from "@/components/gastos-period-view";

type ExpenseRow = {
  id: string;
  amount: number;
  currency: string;
  merchant: string | null;
  occurred_at: string;
  categories: { name: string; icon: string } | null;
};

export default async function GastosPage() {
  const now = new Date();
  const yearStart = new Date(Date.UTC(now.getFullYear() - 1, now.getMonth(), 1));

  const supabase = await createClient();
  const { data } = await supabase
    .from("expenses")
    .select("id, amount, currency, merchant, occurred_at, categories(name, icon)")
    .gte("occurred_at", yearStart.toISOString())
    .order("occurred_at", { ascending: false });

  const expenses = (data ?? []) as unknown as ExpenseRow[];
  const todayKey = dayKey(now);
  const todayMs = new Date(todayKey + "T12:00:00Z").getTime();

  const items: GastoItem[] = expenses.map((e) => {
    const d = new Date(e.occurred_at);
    const key = dayKey(d);
    const ms = new Date(key + "T12:00:00Z").getTime();
    const ago = Math.round((todayMs - ms) / 86_400_000);
    const title = e.merchant ?? "Gasto";
    const category = e.categories?.name ?? "Sin categoría";
    return {
      id: e.id,
      title,
      category,
      amount: Number(e.amount),
      currency: e.currency,
      dayLabel: formatDayLabel(key),
      ago,
      thisMonth: d.getUTCFullYear() === now.getFullYear() && d.getUTCMonth() === now.getMonth(),
      thisYear: d.getUTCFullYear() === now.getFullYear(),
      mono: (title || "?").trim().charAt(0).toUpperCase(),
      color: categoryColor(category),
    };
  });

  return <GastosPeriodView items={items} />;
}
