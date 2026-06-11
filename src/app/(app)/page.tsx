import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatMonth, formatMoneyShort, dayKey } from "@/lib/format";
import { CategoryIcon, categoryColor } from "@/lib/category-style";

type ExpenseRow = {
  id: string;
  amount: number;
  currency: string;
  merchant: string | null;
  occurred_at: string;
  source: string;
  categories: { name: string; icon: string } | null;
};

const WEEKDAY = ["D", "L", "M", "M", "J", "V", "S"];

export default async function InicioPage() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const start = new Date(Date.UTC(year, month - 1, 1));
  const prevStart = new Date(Date.UTC(year, month - 2, 1));

  const supabase = await createClient();
  const [{ data }, { data: profile }] = await Promise.all([
    supabase
      .from("expenses")
      .select("id, amount, currency, merchant, occurred_at, source, categories(name, icon)")
      .gte("occurred_at", prevStart.toISOString())
      .order("occurred_at", { ascending: false }),
    supabase.from("profiles").select("display_name, default_currency").maybeSingle(),
  ]);

  const all = (data ?? []) as unknown as ExpenseRow[];
  const expenses = all.filter((e) => e.occurred_at >= start.toISOString());
  const prevExpenses = all.filter((e) => e.occurred_at < start.toISOString());

  const currency = profile?.default_currency ?? expenses[0]?.currency ?? "MXN";
  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const prevTotal = prevExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const name = profile?.display_name?.trim() || null;
  const initial = (name ?? "G").charAt(0).toUpperCase();

  // Desglose por categoría
  const byCategory = new Map<string, { icon: string; total: number; count: number }>();
  for (const e of expenses) {
    const catName = e.categories?.name ?? "Sin categoría";
    const icon = e.categories?.icon ?? "❓";
    const entry = byCategory.get(catName) ?? { icon, total: 0, count: 0 };
    entry.total += Number(e.amount);
    entry.count += 1;
    byCategory.set(catName, entry);
  }
  const cats = [...byCategory.entries()].sort((a, b) => b[1].total - a[1].total);

  // Esta semana: últimos 7 días (incluye hoy)
  const week: { label: string; key: string; total: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    week.push({ label: WEEKDAY[d.getDay()], key: dayKey(d), total: 0 });
  }
  for (const e of all) {
    const key = dayKey(new Date(e.occurred_at));
    const slot = week.find((w) => w.key === key);
    if (slot) slot.total += Number(e.amount);
  }
  const maxWeek = Math.max(...week.map((w) => w.total), 1);
  const todayKey = dayKey(new Date());

  const prevMonthName = formatMonth(
    month === 1 ? year - 1 : year,
    month === 1 ? 12 : month - 1
  ).split(" ")[0].toLowerCase();
  const deltaPct = prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : null;

  return (
    <div className="screen-in">
      {/* Header */}
      <div className="mt-1.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-gradient-to-br from-[#E89B6C] to-[#D9694A] text-lg font-extrabold text-white">
            {initial}
          </div>
          <div>
            <div className="text-[13px] font-medium text-muted">
              {name ? `Buenas, ${name}` : "Buenas"}
            </div>
            <div className="text-xl font-extrabold leading-tight tracking-tight">
              {formatMonth(year, month)}
            </div>
          </div>
        </div>
        <Link
          href="/agregar"
          aria-label="Agregar gasto"
          className="flex h-[42px] w-[42px] items-center justify-center rounded-full border-[1.6px] border-ink"
        >
          <svg width="19" height="19" viewBox="0 0 19 19" fill="none" stroke="#15140F" strokeWidth="2" strokeLinecap="round">
            <path d="M9.5 3.5v12M3.5 9.5h12" />
          </svg>
        </Link>
      </div>

      {/* Balance card */}
      <div className="relative mt-[18px] overflow-hidden rounded-[28px] bg-coral p-6 pb-[22px] text-white">
        <div className="absolute right-[22px] top-6 flex">
          <div className="h-6 w-6 rounded-full bg-[#F3C9A0]" />
          <div className="-ml-2.5 h-6 w-6 rounded-full bg-[#C9533A]" />
        </div>
        <div className="text-sm font-semibold opacity-90">Gastos del mes</div>
        <div className="mt-1 text-[54px] font-extrabold leading-none tracking-[-0.04em] tabular-nums">
          {formatMoneyShort(total, currency)}
        </div>
        <div className="mt-4 flex flex-wrap gap-x-2.5 gap-y-1 text-[13px] font-semibold opacity-90">
          <span>{expenses.length} {expenses.length === 1 ? "gasto" : "gastos"}</span>
          <span className="opacity-50">·</span>
          <span>{cats.length} {cats.length === 1 ? "categoría" : "categorías"}</span>
          {deltaPct !== null && (
            <>
              <span className="opacity-50">·</span>
              <span>
                {deltaPct >= 0 ? "↑" : "↓"} {Math.abs(deltaPct)}% vs {prevMonthName}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Esta semana */}
      <div className="mt-[26px] flex items-center justify-between">
        <h2 className="text-[19px] font-extrabold tracking-tight">Esta semana</h2>
      </div>
      <div className="mt-3 rounded-[26px] bg-sand px-4 pb-4 pt-[22px]">
        <div className="flex items-end justify-between gap-1" style={{ height: 150 }}>
          {week.map((w, i) => {
            const peak = w.total === maxWeek && w.total > 0;
            const isToday = w.key === todayKey;
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <span
                  className="text-[10px] font-bold tabular-nums"
                  style={{ color: peak ? "#C56A47" : "#A79C78" }}
                >
                  ${Math.round(w.total).toLocaleString("es-MX")}
                </span>
                <div
                  className="rounded-md"
                  style={{
                    width: peak ? 13 : 9,
                    height: Math.max(8, (w.total / maxWeek) * 100),
                    background: peak ? "#E07C55" : "#15140F",
                    opacity: w.total > 0 ? 1 : 0.25,
                  }}
                />
                <span
                  className="text-[11px]"
                  style={{
                    fontWeight: isToday ? 800 : 600,
                    color: isToday ? "#15140F" : "#A79C78",
                  }}
                >
                  {w.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Por categoría */}
      <div className="mt-[26px] flex items-center justify-between">
        <h2 className="text-[19px] font-extrabold tracking-tight">Por categoría</h2>
        <Link href="/gastos" className="text-[13px] font-bold text-coral-link">
          Ver todo
        </Link>
      </div>
      {cats.length === 0 ? (
        <div className="mt-3.5 rounded-[22px] bg-white p-6 text-center text-sm font-medium text-muted">
          Sin gastos este mes.{" "}
          <Link href="/ajustes/atajos" className="font-bold text-coral-link">
            Configura tu iPhone
          </Link>{" "}
          para registrarlos automáticamente.
        </div>
      ) : (
        <div className="mt-3.5 flex flex-col gap-[11px]">
          {cats.map(([catName, { icon, total: catTotal, count }]) => (
            <div key={catName} className="flex items-center gap-3.5 rounded-[22px] bg-white px-[17px] py-[15px]">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-[14px]"
                style={{ background: categoryColor(catName) }}
              >
                <CategoryIcon name={catName} emoji={icon} color="#15140F" size={22} />
              </div>
              <div className="flex-1">
                <div className="text-base font-bold tracking-tight">{catName}</div>
                <div className="text-xs font-medium text-muted">
                  {count} {count === 1 ? "gasto" : "gastos"}
                </div>
              </div>
              <div className="text-lg font-extrabold tracking-tight tabular-nums">
                {formatMoneyShort(catTotal, currency)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
