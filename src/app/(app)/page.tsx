import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatMonth, formatMoneyShort, dayKey } from "@/lib/format";
import { categoryColor } from "@/lib/category-style";
import { AvatarEgg } from "@/components/avatar-egg";
import { MonthlyRecap } from "@/components/monthly-recap";
import {
  isActiveNow,
  daysUntilDay,
  spendingStatus,
  KIND_LABEL,
  type RecurringPayment,
} from "@/lib/finance";

type ExpenseRow = {
  id: string;
  amount: number;
  currency: string;
  merchant: string | null;
  occurred_at: string;
  source: string;
  categories: { name: string; icon: string; color: string | null } | null;
};

const WEEKDAY = ["D", "L", "M", "M", "J", "V", "S"];
// Colores distintos para los accesos de Inicio.
const LINK_COLORS: Record<string, string> = {
  "/dividir": "#A7D9BF",
  "/viajes": "#9EC8E0",
  "/fijos": "#C9B8E8",
};
// Color del número/barra de "Disponible" según la salud del gasto.
const STATUS_COLOR: Record<string, string> = {
  ok: "#2FA37A",
  good: "#2FA37A",
  watch: "#E0A012",
  tight: "#FF6518",
  over: "#D8402A",
};

export default async function InicioPage() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const start = new Date(Date.UTC(year, month - 1, 1));
  const prevStart = new Date(Date.UTC(year, month - 2, 1));

  const supabase = await createClient();
  const [
    { data },
    { data: profile },
    { data: token },
    { data: budgetRow },
    { data: incomeRow },
    { data: rawPayments },
    { data: categories },
  ] = await Promise.all([
    supabase
      .from("expenses")
      .select("id, amount, currency, merchant, occurred_at, source, categories(name, icon, color)")
      .gte("occurred_at", prevStart.toISOString())
      .order("occurred_at", { ascending: false }),
    supabase.from("profiles").select("display_name, default_currency").maybeSingle(),
    supabase.from("api_tokens").select("id").maybeSingle(),
    supabase.from("profiles").select("monthly_budget").maybeSingle(),
    supabase.from("profiles").select("monthly_income").maybeSingle(),
    supabase
      .from("recurring_payments")
      .select("id, kind, name, amount, currency, day_of_month, category_id, total_months, start_date, active, color"),
    supabase.from("categories").select("id, name, color"),
  ]);

  const monthlyBudget = budgetRow?.monthly_budget ? Number(budgetRow.monthly_budget) : null;
  const monthlyIncome = incomeRow?.monthly_income ? Number(incomeRow.monthly_income) : null;
  const payments = ((rawPayments ?? []) as RecurringPayment[]).filter((p) => isActiveNow(p));
  // Mapa categoría → color para pintar los badges de pagos fijos.
  const catColorById = new Map(
    (categories ?? []).map((c) => [c.id, categoryColor(c.name, c.color)] as const)
  );
  const catColorByName = new Map(
    (categories ?? []).map((c) => [c.name, categoryColor(c.name, c.color)] as const)
  );
  const colorOfCat = (n?: string | null) => (n && catColorByName.get(n)) || categoryColor(n);

  const all = (data ?? []) as unknown as ExpenseRow[];
  const expenses = all.filter((e) => e.occurred_at >= start.toISOString());
  const prevExpenses = all.filter((e) => e.occurred_at < start.toISOString());

  const currency = profile?.default_currency ?? expenses[0]?.currency ?? "MXN";
  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const prevTotal = prevExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const name = profile?.display_name?.trim() || null;
  const initial = (name ?? "C").charAt(0).toUpperCase();

  // Pagos fijos que aún no se cobran este mes.
  const today = now.getDate();
  const pendingCommitted = payments
    .filter((p) => p.amount && p.day_of_month >= today)
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const status =
    monthlyIncome && monthlyIncome > 0 ? spendingStatus(monthlyIncome, total, pendingCommitted) : null;

  const upcoming = [...payments]
    .map((p) => ({ p, days: daysUntilDay(p.day_of_month, now) }))
    .sort((a, b) => a.days - b.days)
    .slice(0, 4);
  const cardSoon = upcoming.find((u) => u.p.kind === "card" && u.days <= 5);

  // Desglose por categoría → bandas
  const byCategory = new Map<string, { total: number; count: number }>();
  for (const e of expenses) {
    const catName = e.categories?.name ?? "Sin categoría";
    const entry = byCategory.get(catName) ?? { total: 0, count: 0 };
    entry.total += Number(e.amount);
    entry.count += 1;
    byCategory.set(catName, entry);
  }
  const cats = [...byCategory.entries()].sort((a, b) => b[1].total - a[1].total);

  // Esta semana: últimos 7 días, con la categoría dominante de cada día.
  const week: { label: string; key: string; total: number; cats: Map<string, number> }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    week.push({ label: WEEKDAY[d.getDay()], key: dayKey(d), total: 0, cats: new Map() });
  }
  for (const e of all) {
    const key = dayKey(new Date(e.occurred_at));
    const slot = week.find((w) => w.key === key);
    if (slot) {
      const amt = Number(e.amount);
      slot.total += amt;
      const cn = e.categories?.name ?? "Otros";
      slot.cats.set(cn, (slot.cats.get(cn) ?? 0) + amt);
    }
  }
  const weekTopColor = (w: { cats: Map<string, number> }) => {
    let best: string | null = null;
    let max = 0;
    for (const [n, v] of w.cats) if (v > max) { max = v; best = n; }
    return colorOfCat(best);
  };
  const maxWeek = Math.max(...week.map((w) => w.total), 1);
  const todayKey = dayKey(new Date());

  // Racha: días consecutivos con al menos un gasto, terminando hoy (o ayer).
  const daysWithExpense = new Set(all.map((e) => dayKey(new Date(e.occurred_at))));
  let streak = 0;
  let cursor = new Date();
  if (!daysWithExpense.has(dayKey(cursor))) cursor = new Date(Date.now() - 86_400_000);
  while (daysWithExpense.has(dayKey(cursor))) {
    streak++;
    cursor = new Date(cursor.getTime() - 86_400_000);
  }

  const prevMonthName = formatMonth(month === 1 ? year - 1 : year, month === 1 ? 12 : month - 1)
    .split(" ")[0]
    .toLowerCase();
  const deltaPct = prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : null;

  const budgetPct = monthlyBudget && monthlyBudget > 0 ? Math.min(100, Math.round((total / monthlyBudget) * 100)) : 0;
  const budgetAvail = monthlyBudget ? Math.max(0, monthlyBudget - total) : 0;

  // Resumen del mes pasado (categoría top).
  const prevByCat = new Map<string, number>();
  for (const e of prevExpenses) {
    const n = e.categories?.name ?? "Otros";
    prevByCat.set(n, (prevByCat.get(n) ?? 0) + Number(e.amount));
  }
  let prevTopCat = "—";
  let prevTopMax = 0;
  for (const [n, v] of prevByCat) if (v > prevTopMax) { prevTopMax = v; prevTopCat = n; }
  const prevTopColor = colorOfCat(prevTopCat);

  return (
    <div className="screen-in px-1 pt-2.5">
      {/* Wordmark */}
      <div className="flex items-center justify-between">
        <div>
          <div className="font-display text-[34px] font-black leading-[0.85] tracking-[-0.02em]">COCO</div>
          <div className="mt-1 text-[8.5px] font-bold uppercase tracking-[0.2em] text-muted">
            gasta con cabeza
          </div>
        </div>
        <AvatarEgg initial={initial} />
      </div>

      {/* HERO — gastos del mes */}
      <div className="mt-[30px]">
        <div className="text-[13px] font-semibold text-muted">
          Gastos del mes — {formatMonth(year, month)}
        </div>
        <div className="count-up font-display mt-1.5 text-[78px] font-black leading-[0.92] tracking-[-0.03em] tabular-nums">
          {formatMoneyShort(total, currency)}
        </div>
        <div className="mt-3.5 flex flex-wrap gap-2">
          {streak >= 2 && (
            <span className="whitespace-nowrap rounded-full bg-coral px-3 py-1.5 text-xs font-bold text-ink">
              🔥 {streak} días seguidos
            </span>
          )}
          {deltaPct !== null && (
            <span className="whitespace-nowrap rounded-full bg-ink px-3 py-1.5 text-xs font-bold text-crema">
              {deltaPct >= 0 ? "↑" : "↓"} {Math.abs(deltaPct)}% vs {prevMonthName}
            </span>
          )}
          <span className="whitespace-nowrap rounded-full border border-input-border px-3 py-1.5 text-xs font-bold text-ink">
            {expenses.length} {expenses.length === 1 ? "gasto" : "gastos"}
          </span>
        </div>
      </div>

      {prevTotal > 0 && (
        <MonthlyRecap
          monthName={prevMonthName}
          total={formatMoneyShort(prevTotal, currency)}
          topCategory={prevTopCat}
          topColor={prevTopColor}
          count={prevExpenses.length}
        />
      )}

      {/* Presupuesto */}
      {monthlyBudget && monthlyBudget > 0 ? (
        <div className="pop-in mt-[22px] rounded-[22px] border border-input-border bg-white px-[18px] py-5">
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] font-bold">Presupuesto de {formatMonth(year, month).split(" ")[0].toLowerCase()}</span>
            <span className="text-[13px] font-extrabold text-coral">{budgetPct}%</span>
          </div>
          <div className="mt-3 h-3.5 overflow-hidden rounded-full bg-track">
            <div className="h-full rounded-full bg-coral" style={{ width: `${budgetPct}%` }} />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-xs font-semibold text-muted">
              {formatMoneyShort(total, currency)} de {formatMoneyShort(monthlyBudget, currency)}
            </span>
            <span className="text-[15px] font-extrabold tracking-tight">
              {formatMoneyShort(budgetAvail, currency)}{" "}
              <span className="text-[11px] font-semibold text-muted">disponible</span>
            </span>
          </div>
        </div>
      ) : (
        <Link
          href="/ajustes"
          className="mt-[22px] flex items-center justify-between rounded-[22px] border border-input-border bg-white px-[18px] py-4"
        >
          <span className="text-[15px] font-bold">Ponte un presupuesto mensual</span>
          <span className="text-xl font-extrabold text-coral">→</span>
        </Link>
      )}

      {/* Disponible + salud financiera */}
      {status && (
        <div className="pop-in mt-3 rounded-[22px] border border-input-border bg-white px-[18px] py-5">
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] font-bold">Disponible este mes</span>
            <span className="text-xs font-semibold text-muted">de {formatMoneyShort(monthlyIncome!, currency)}</span>
          </div>
          <div
            className="font-display mt-1 text-[40px] font-black leading-none tracking-[-0.03em] tabular-nums"
            style={{ color: STATUS_COLOR[status.level] }}
          >
            {formatMoneyShort(status.available, currency)}
          </div>
          <div className="mt-3.5 h-2.5 overflow-hidden rounded-full bg-track">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.min(Math.round(status.pct * 100), 100)}%`, background: STATUS_COLOR[status.level] }}
            />
          </div>
          <div className="mt-2.5 text-[13px] font-semibold leading-snug">
            <span style={{ color: STATUS_COLOR[status.level] }}>{status.title}.</span>{" "}
            <span className="font-medium text-muted">{status.message}</span>
          </div>
        </div>
      )}

      {/* Próximos pagos */}
      {upcoming.length > 0 && (
        <div className="mt-6">
          <div className="mb-2.5 flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Próximos pagos</span>
            <Link href="/fijos" className="text-[13px] font-bold text-coral-link">Administrar</Link>
          </div>
          {cardSoon && (
            <div className="mb-2.5 rounded-[16px] bg-coral px-4 py-3 text-[13px] font-bold leading-snug text-ink">
              💳 {cardSoon.p.name} se paga{" "}
              {cardSoon.days === 0 ? "hoy" : cardSoon.days === 1 ? "mañana" : `en ${cardSoon.days} días`}
              {cardSoon.p.amount ? ` · ${formatMoneyShort(Number(cardSoon.p.amount), currency)}` : ""}.
            </div>
          )}
          <div className="flex flex-col divide-y divide-crema rounded-[20px] bg-white px-[18px]">
            {upcoming.map(({ p, days }, i) => {
              const catColor = p.category_id ? catColorById.get(p.category_id) : undefined;
              const badgeBg = p.kind === "card" ? "#FF6518" : catColor ?? "var(--color-sand)";
              return (
              <div
                key={p.id}
                className="flex items-center gap-3 py-3"
                style={{ animation: `slide-r .5s ${(0.05 + i * 0.06).toFixed(2)}s both` }}
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-extrabold tabular-nums text-ink"
                  style={{ background: badgeBg }}
                >
                  {p.day_of_month}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-bold tracking-tight">{p.name}</div>
                  <div className="text-xs font-medium text-muted">
                    {KIND_LABEL[p.kind]} · {days === 0 ? "hoy" : days === 1 ? "mañana" : `en ${days} días`}
                  </div>
                </div>
                {p.amount ? (
                  <div className="text-[15px] font-extrabold tabular-nums">
                    {formatMoneyShort(Number(p.amount), currency)}
                  </div>
                ) : (
                  <span className="text-xs font-medium text-muted">variable</span>
                )}
              </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bandas de categoría */}
      {cats.length > 0 && (
        <div className="mt-7">
          <div className="px-1 pb-3 text-xs font-bold uppercase tracking-[0.08em] text-muted">Por categoría</div>
          <div className="overflow-hidden rounded-[20px]">
            {cats.map(([catName, { total: catTotal, count }], i) => {
              const pct = total > 0 ? Math.round((catTotal / total) * 100) : 0;
              return (
                <Link
                  key={catName}
                  href="/gastos"
                  className="band-row flex items-center gap-3.5"
                  style={{ background: colorOfCat(catName), padding: "17px 22px", animation: `slide-r .5s ${(0.06 + i * 0.06).toFixed(2)}s both` }}
                >
                  <span className="flex h-[27px] w-[27px] flex-none items-center justify-center rounded-full border-[1.6px] border-black/50 text-xs font-extrabold text-[#111]">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="font-display block truncate text-[26px] font-black leading-none tracking-[-0.02em] text-[#111]">
                      {catName}
                    </span>
                    <span className="mt-1.5 block text-xs font-semibold text-black/55">
                      {count} {count === 1 ? "gasto" : "gastos"} · {pct}%
                    </span>
                  </span>
                  <span className="flex-none text-[19px] font-extrabold tracking-[-0.02em] text-[#111]">
                    {formatMoneyShort(catTotal, currency)}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Esta semana */}
      <div className="mt-7 flex items-end justify-between px-1">
        <div>
          <div className="text-xs font-semibold text-muted">Tendencia</div>
          <div className="mt-0.5 text-2xl font-extrabold leading-none tracking-[-0.03em]">Esta semana</div>
        </div>
      </div>
      <div className="mt-4 px-1">
        <div className="flex items-end justify-between gap-2" style={{ height: 130 }}>
          {week.map((w, i) => {
            const peak = w.total === maxWeek && w.total > 0;
            const isToday = w.key === todayKey;
            const barColor = w.total > 0 ? weekTopColor(w) : "var(--color-ink)";
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <span
                  className="text-[10px] font-bold tabular-nums"
                  style={{ color: w.total > 0 ? barColor : "var(--color-muted)" }}
                >
                  ${Math.round(w.total).toLocaleString("es-MX")}
                </span>
                <div
                  className="rounded"
                  style={{
                    width: peak ? 14 : 11,
                    height: Math.max(8, (w.total / maxWeek) * 90),
                    background: barColor,
                    opacity: w.total > 0 ? 1 : 0.25,
                    transformOrigin: "bottom",
                    animation: `bar-rise .6s cubic-bezier(.2,.8,.2,1) ${(0.1 + i * 0.06).toFixed(2)}s both`,
                  }}
                />
                <span
                  className="text-[11px]"
                  style={{ fontWeight: isToday ? 800 : 600, color: isToday ? "var(--color-ink)" : "var(--color-muted)" }}
                >
                  {w.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Accesos: dividir, viajes, fijos, conectar iPhone */}
      <div className="mt-7 flex flex-col gap-2">
        {!token && (
          <Link href="/ajustes/atajos" className="flex items-center justify-between rounded-[18px] bg-ink px-[18px] py-4 text-crema">
            <div>
              <div className="text-[15px] font-bold">Conecta tu iPhone</div>
              <div className="text-xs font-medium opacity-70">Que tus gastos se registren solos</div>
            </div>
            <span className="text-lg font-extrabold text-coral">→</span>
          </Link>
        )}
        <HomeLink i={0} href="/dividir" title="Dividir cuenta" sub="Foto del ticket y calculamos tu parte" />
        <HomeLink i={1} href="/viajes" title="Viajes" sub="El bote compartido: cuánto queda y quién debe" />
        <HomeLink i={2} href="/fijos" title="Pagos fijos" sub="Suscripciones, meses y tu tarjeta" />
      </div>
    </div>
  );
}

function HomeLink({ href, title, sub, i }: { href: string; title: string; sub: string; i: number }) {
  return (
    <Link
      href={href}
      className="press flex items-center justify-between rounded-[18px] px-[18px] py-4 text-[#111]"
      style={{ background: LINK_COLORS[href] ?? "var(--color-sand)", animation: `slide-r .5s ${(0.06 + i * 0.07).toFixed(2)}s both` }}
    >
      <div>
        <div className="text-[15px] font-bold tracking-tight">{title}</div>
        <div className="text-xs font-medium text-black/55">{sub}</div>
      </div>
      <span className="text-lg font-extrabold">→</span>
    </Link>
  );
}
