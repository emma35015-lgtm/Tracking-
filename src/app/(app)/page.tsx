import type { ReactNode } from "react";
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

  // Desglose por categoría → fichas
  const byCategory = new Map<string, { total: number; count: number; icon: string }>();
  for (const e of expenses) {
    const catName = e.categories?.name ?? "Sin categoría";
    const entry = byCategory.get(catName) ?? { total: 0, count: 0, icon: e.categories?.icon ?? "🏷️" };
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
          <div className="text-[26px] font-extrabold leading-[0.85] tracking-[-0.05em]">COCO</div>
          <div className="mt-1 text-[8.5px] font-bold uppercase tracking-[0.2em] text-muted">
            gasta con cabeza
          </div>
        </div>
        <AvatarEgg initial={initial} />
      </div>

      {/* HERO — statement */}
      <div className="mt-9">
        <div className="text-[15px] font-semibold text-muted">
          {name ? `Buenas, ${name}` : "Buenas"}
        </div>
        <div className="mt-1 text-[30px] font-extrabold leading-[1.04] tracking-[-0.03em]">
          Esto llevas en {formatMonth(year, month)}
        </div>

        <div className="mt-6">
          <div className="count-up text-[76px] font-extrabold leading-[0.9] tracking-[-0.05em] tabular-nums">
            {formatMoneyShort(total, currency)}
          </div>
          <div className="mt-1.5 text-[12px] font-bold uppercase tracking-[0.16em] text-muted">
            Gastos del mes
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
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

      {/* Restante del presupuesto — bloque abierto */}
      {monthlyBudget && monthlyBudget > 0 ? (
        <Link href="/ajustes" className="mt-10 block">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
              Restante del presupuesto
            </span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
              <path d="M7 17 17 7M9 7h8v8" />
            </svg>
          </div>
          <div className="mt-2 text-[48px] font-extrabold leading-none tracking-[-0.04em] tabular-nums">
            {formatMoneyShort(budgetAvail, currency)}
          </div>
          <div className="mt-3.5 h-2 overflow-hidden rounded-full bg-track">
            <div className="h-full rounded-full bg-coral" style={{ width: `${budgetPct}%` }} />
          </div>
          <div className="mt-2 text-xs font-semibold text-muted">
            {formatMoneyShort(total, currency)} de {formatMoneyShort(monthlyBudget, currency)}
          </div>
        </Link>
      ) : (
        <Link href="/ajustes" className="mt-10 flex items-center justify-between">
          <span className="text-[15px] font-bold">Ponte un presupuesto mensual</span>
          <span className="text-xl font-extrabold text-coral">→</span>
        </Link>
      )}

      {prevTotal > 0 && (
        <MonthlyRecap
          monthName={prevMonthName}
          total={formatMoneyShort(prevTotal, currency)}
          topCategory={prevTopCat}
          topColor={prevTopColor}
          count={prevExpenses.length}
        />
      )}

      {/* Disponible — bloque abierto */}
      {status && (
        <div className="mt-10">
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">Disponible este mes</span>
            <span className="text-xs font-semibold text-muted">de {formatMoneyShort(monthlyIncome!, currency)}</span>
          </div>
          <div
            className="mt-2 text-[48px] font-extrabold leading-none tracking-[-0.04em] tabular-nums"
            style={{ color: STATUS_COLOR[status.level] }}
          >
            {formatMoneyShort(status.available, currency)}
          </div>
          <div className="mt-3.5 h-2 overflow-hidden rounded-full bg-track">
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

      {/* Próximos pagos — abierto */}
      {upcoming.length > 0 && (
        <div className="mt-10">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">Próximos pagos</span>
            <Link href="/fijos" className="text-[13px] font-bold text-coral-link">Administrar</Link>
          </div>
          {cardSoon && (
            <div className="border-b border-crema py-3 text-[13px] font-bold leading-snug text-coral-dark">
              💳 {cardSoon.p.name} se paga{" "}
              {cardSoon.days === 0 ? "hoy" : cardSoon.days === 1 ? "mañana" : `en ${cardSoon.days} días`}
              {cardSoon.p.amount ? ` · ${formatMoneyShort(Number(cardSoon.p.amount), currency)}` : ""}.
            </div>
          )}
          <div className="flex flex-col divide-y divide-crema">
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
        <div className="mt-12">
          <div className="px-1 pb-3 text-xs font-bold uppercase tracking-[0.08em] text-muted">Por categoría</div>
          <div className="-mx-[14px]">
            {cats.map(([catName, { total: catTotal, count }], i) => {
              const pct = total > 0 ? Math.round((catTotal / total) * 100) : 0;
              return (
                <Link
                  key={catName}
                  href="/gastos"
                  className="relative block rounded-[28px] px-6 pb-5 pt-5"
                  style={{
                    background: colorOfCat(catName),
                    marginTop: i === 0 ? 0 : -22,
                    zIndex: i + 1,
                    boxShadow: "0 -10px 24px -12px rgba(0,0,0,0.28)",
                    animation: `slide-r .5s ${(0.06 + i * 0.06).toFixed(2)}s both`,
                  }}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/10 text-[18px] font-extrabold text-[#111]">
                    {i + 1}
                  </div>
                  <div className="mt-6 flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-black/45">
                        {count} {count === 1 ? "gasto" : "gastos"} · {pct}%
                      </div>
                      <div className="truncate text-[24px] font-extrabold tracking-[-0.02em] text-[#111]">
                        {catName}
                      </div>
                    </div>
                    <div className="flex-none text-[22px] font-extrabold tabular-nums text-[#111]">
                      {formatMoneyShort(catTotal, currency)}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Esta semana */}
      <div className="mt-12 flex items-end justify-between px-1">
        <div>
          <div className="text-xs font-semibold text-muted">Tendencia</div>
          <div className="mt-0.5 text-[26px] font-extrabold leading-none tracking-[-0.03em]">Esta semana</div>
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

      {/* Accesos como fichas encimadas */}
      <div className="mt-12 -mx-[14px]">
        {!token && (
          <HomeCard
            i={0}
            href="/ajustes/atajos"
            title="Conecta tu iPhone"
            sub="Que tus gastos se registren solos"
            color="var(--color-ink)"
            dark
            icon={
              <>
                <rect x="6" y="2.5" width="12" height="19" rx="3" />
                <path d="M11 18.5h2" />
              </>
            }
          />
        )}
        <HomeCard
          i={token ? 0 : 1}
          href="/dividir"
          title="Dividir cuenta"
          sub="Foto del ticket y calculamos tu parte"
          color="#A7D9BF"
          icon={<path d="M6 3h12v18l-2-1.5L14 21l-2-1.5L10 21l-2-1.5L6 21V3Z M9 8h6 M9 12h6" />}
        />
        <HomeCard
          i={token ? 1 : 2}
          href="/viajes"
          title="Viajes"
          sub="El bote compartido: cuánto queda y quién debe"
          color="#9EC8E0"
          icon={
            <>
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </>
          }
        />
        <HomeCard
          i={token ? 2 : 3}
          href="/fijos"
          title="Pagos fijos"
          sub="Suscripciones, meses y tu tarjeta"
          color="#C9B8E8"
          icon={
            <>
              <rect x="3" y="5" width="18" height="14" rx="2.6" />
              <path d="M3 9.5h18" />
            </>
          }
        />
      </div>
    </div>
  );
}

function HomeCard({
  href,
  title,
  sub,
  i,
  color,
  icon,
  dark = false,
}: {
  href: string;
  title: string;
  sub: string;
  i: number;
  color: string;
  icon: ReactNode;
  dark?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`relative block rounded-[28px] px-6 pb-5 pt-5 ${
        dark ? "bg-[#15140f] text-[#efe7d2] dark:bg-[#2c2820]" : ""
      }`}
      style={{
        background: dark ? undefined : color,
        color: dark ? undefined : "#111",
        marginTop: i === 0 ? 0 : -22,
        zIndex: i + 1,
        boxShadow: "0 -10px 24px -12px rgba(0,0,0,0.28)",
        animation: `slide-r .5s ${(0.06 + i * 0.07).toFixed(2)}s both`,
      }}
    >
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full"
        style={{ background: dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)" }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={dark ? "currentColor" : "#111111"} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          {icon}
        </svg>
      </div>
      <div className="mt-6 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[24px] font-extrabold tracking-[-0.02em]">{title}</div>
          <div className="text-[13px] font-semibold" style={{ color: dark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)" }}>
            {sub}
          </div>
        </div>
        <span className="flex-none text-2xl font-extrabold">→</span>
      </div>
    </Link>
  );
}
