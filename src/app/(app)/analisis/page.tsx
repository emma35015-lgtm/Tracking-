import { createClient } from "@/lib/supabase/server";
import { formatMoney, formatMoneyShort } from "@/lib/format";
import { resolveMonth } from "@/lib/months";
import { MonthHeader } from "@/components/month-header";
import { categoryColor } from "@/lib/category-style";

type ExpenseRow = {
  amount: number;
  currency: string;
  merchant: string | null;
  occurred_at: string;
  source: string;
  categories: { name: string; icon: string } | null;
};

function sum(list: ExpenseRow[]) {
  return list.reduce((acc, e) => acc + Number(e.amount), 0);
}

function groupByCategory(list: ExpenseRow[]) {
  const map = new Map<string, { icon: string; total: number; count: number }>();
  for (const e of list) {
    const name = e.categories?.name ?? "Sin categoría";
    const icon = e.categories?.icon ?? "❓";
    const entry = map.get(name) ?? { icon, total: 0, count: 0 };
    entry.total += Number(e.amount);
    entry.count += 1;
    map.set(name, entry);
  }
  return map;
}

// Tips de ahorro calculados sobre los datos reales del mes.
function buildTips(
  current: ExpenseRow[],
  previous: ExpenseRow[],
  currency: string,
  daysElapsed: number,
  daysInMonth: number
): string[] {
  const tips: string[] = [];
  const total = sum(current);
  if (total === 0) return tips;

  const byCat = groupByCategory(current);
  const byCatPrev = groupByCategory(previous);

  // Proyección de cierre de mes
  if (daysElapsed >= 5 && daysElapsed < daysInMonth) {
    const projected = (total / daysElapsed) * daysInMonth;
    tips.push(
      `Llevas ${formatMoneyShort(total, currency)} en ${daysElapsed} días. A este ritmo, cerrarás el mes en ~${formatMoneyShort(projected, currency)}.`
    );
  }

  // Categoría que más creció vs el mes pasado
  let worstCat: { name: string; growth: number; now: number } | null = null;
  for (const [name, { total: now }] of byCat) {
    const before = byCatPrev.get(name)?.total ?? 0;
    if (before >= 100 && now > before * 1.25) {
      const growth = ((now - before) / before) * 100;
      if (!worstCat || growth > worstCat.growth) worstCat = { name, growth, now };
    }
  }
  if (worstCat) {
    tips.push(
      `Ojo: ${worstCat.name} creció ${Math.round(worstCat.growth)}% vs el mes pasado (${formatMoneyShort(worstCat.now, currency)}). Es el primer lugar donde buscar recortes.`
    );
  }

  // Gasto hormiga: muchos gastos chicos que suman
  const small = current.filter((e) => Number(e.amount) <= 100);
  const smallTotal = sum(small);
  if (small.length >= 8 && smallTotal > total * 0.15) {
    tips.push(
      `Gasto hormiga: ${small.length} compras de ${formatMoney(100, currency)} o menos suman ${formatMoneyShort(smallTotal, currency)} (${Math.round((smallTotal / total) * 100)}% de tu mes). Son las que menos se sienten y más pesan.`
    );
  }

  // Suscripciones anualizadas
  const subs = byCat.get("Suscripciones");
  if (subs && subs.total > 0) {
    tips.push(
      `Tus suscripciones cuestan ${formatMoneyShort(subs.total, currency)} al mes — ${formatMoneyShort(subs.total * 12, currency)} al año. ¿Las usas todas?`
    );
  }

  // Comercio más frecuente
  const byMerchant = new Map<string, { total: number; count: number }>();
  for (const e of current) {
    if (!e.merchant) continue;
    const entry = byMerchant.get(e.merchant) ?? { total: 0, count: 0 };
    entry.total += Number(e.amount);
    entry.count += 1;
    byMerchant.set(e.merchant, entry);
  }
  const topMerchant = [...byMerchant.entries()].sort((a, b) => b[1].count - a[1].count)[0];
  if (topMerchant && topMerchant[1].count >= 4) {
    tips.push(
      `Tu lugar más frecuente: ${topMerchant[0]} (${topMerchant[1].count} veces, ${formatMoneyShort(topMerchant[1].total, currency)}). Pequeños cambios ahí tienen el mayor impacto.`
    );
  }

  // Comparación general con el mes anterior
  const prevTotal = sum(previous);
  if (prevTotal > 0 && daysElapsed >= daysInMonth) {
    const diff = total - prevTotal;
    if (diff < 0) {
      tips.push(`Gastaste ${formatMoneyShort(Math.abs(diff), currency)} menos que el mes pasado. ¡Sigue así!`);
    }
  }

  // Regla general si hay pocos tips
  if (tips.length < 2) {
    tips.push(
      "Regla 50/30/20: intenta que lo esencial sea ~50% de tu ingreso, gustos ~30% y ahorro ~20%. Compara con tu desglose de arriba."
    );
  }

  return tips;
}

export default async function AnalisisPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes } = await searchParams;
  const { year, month, start, end, prev, next } = resolveMonth(mes);

  // Mes anterior, para comparar
  const prevStart = new Date(Date.UTC(year, month - 2, 1));

  const supabase = await createClient();
  const { data } = await supabase
    .from("expenses")
    .select("amount, currency, merchant, occurred_at, source, categories(name, icon)")
    .gte("occurred_at", prevStart.toISOString())
    .lt("occurred_at", end.toISOString())
    .order("occurred_at", { ascending: true });

  const all = (data ?? []) as unknown as ExpenseRow[];
  const current = all.filter((e) => e.occurred_at >= start.toISOString());
  const previous = all.filter((e) => e.occurred_at < start.toISOString());

  const currency = current[0]?.currency ?? previous[0]?.currency ?? "MXN";
  const total = sum(current);
  const prevTotal = sum(previous);

  const daysInMonth = new Date(year, month, 0).getDate();
  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month;
  const daysElapsed = isCurrentMonth ? now.getDate() : daysInMonth;
  const dailyAvg = daysElapsed > 0 ? total / daysElapsed : 0;

  // Gasto por día (para la gráfica de barras)
  const byDay = new Array(daysInMonth).fill(0);
  for (const e of current) {
    const day = new Date(e.occurred_at).getUTCDate();
    byDay[day - 1] += Number(e.amount);
  }
  const maxDay = Math.max(...byDay, 1);
  const peakIndex = byDay.indexOf(Math.max(...byDay));

  const byCat = groupByCategory(current);
  const byCatPrev = groupByCategory(previous);
  const catRows = [...byCat.entries()].sort((a, b) => b[1].total - a[1].total);

  const tips = buildTips(current, previous, currency, daysElapsed, daysInMonth);

  return (
    <div className="screen-in">
      <MonthHeader base="/analisis" subtitle="Análisis" year={year} month={month} prev={prev} next={next} />

      {current.length === 0 ? (
        <div className="mt-6 rounded-[22px] bg-white p-6 text-center text-sm font-medium text-muted">
          Sin gastos este mes. Cuando haya datos, aquí verás tus gráficas y tips.
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          {/* Stat cards */}
          <div className="flex gap-[11px]">
            <div className="flex-1 rounded-[22px] bg-white p-[18px]">
              <div className="text-xs font-semibold text-muted">Este mes</div>
              <div className="mt-2 text-3xl font-extrabold leading-none tracking-[-0.03em] tabular-nums">
                {formatMoneyShort(total, currency)}
              </div>
              {prevTotal > 0 && (
                <div
                  className="mt-1 text-[11px] font-bold"
                  style={{ color: total <= prevTotal ? "#1E4435" : "#C9533A" }}
                >
                  {total <= prevTotal ? "▼" : "▲"}{" "}
                  {Math.abs(Math.round(((total - prevTotal) / prevTotal) * 100))}% vs mes pasado
                </div>
              )}
            </div>
            <div className="flex-1 rounded-[22px] bg-ink p-[18px] text-white">
              <div className="text-xs font-semibold opacity-70">Promedio diario</div>
              <div className="mt-2 text-3xl font-extrabold leading-none tracking-[-0.03em] tabular-nums">
                {formatMoneyShort(dailyAvg, currency)}
              </div>
              <div className="mt-1 text-[11px] opacity-60">
                en {daysElapsed} {daysElapsed === 1 ? "día" : "días"}
              </div>
            </div>
          </div>

          {/* Gasto por día */}
          <section className="rounded-[24px] bg-sand px-4 pb-4 pt-5">
            <h2 className="mb-3 px-1 text-base font-extrabold tracking-tight">Gasto por día</h2>
            <div className="flex h-32 items-end gap-[2px]">
              {byDay.map((amount, i) => {
                const peak = i === peakIndex && amount > 0;
                return (
                  <div
                    key={i}
                    className="flex-1 rounded-t"
                    style={{
                      height: amount > 0 ? `${Math.max(5, (amount / maxDay) * 100)}%` : "3px",
                      background: peak ? "#E07C55" : "#15140F",
                      opacity: amount > 0 ? 1 : 0.18,
                    }}
                    title={`Día ${i + 1}: ${formatMoney(amount, currency)}`}
                  />
                );
              })}
            </div>
            <div className="mt-1.5 flex justify-between text-[10px] font-semibold text-muted-3">
              <span>1</span>
              <span>{Math.round(daysInMonth / 2)}</span>
              <span>{daysInMonth}</span>
            </div>
          </section>

          {/* Por categoría */}
          <section className="rounded-[24px] bg-white p-5">
            <h2 className="mb-4 text-base font-extrabold tracking-tight">Por categoría</h2>
            <div className="flex flex-col gap-[15px]">
              {catRows.map(([name, { total: catTotal }]) => {
                const before = byCatPrev.get(name)?.total ?? 0;
                const pct = total > 0 ? Math.round((catTotal / total) * 100) : 0;
                return (
                  <div key={name}>
                    <div className="mb-[7px] flex items-baseline justify-between">
                      <span className="text-sm font-bold">
                        {name} <span className="font-semibold text-muted-3">{pct}%</span>
                        {before > 0 && (
                          <span
                            className="ml-1.5 text-xs"
                            style={{ color: catTotal <= before ? "#1E4435" : "#C9533A" }}
                          >
                            {catTotal <= before ? "▼" : "▲"}
                          </span>
                        )}
                      </span>
                      <span className="text-sm font-extrabold tabular-nums">
                        {formatMoneyShort(catTotal, currency)}
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-track">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(4, pct)}%`,
                          background: categoryColor(name) === "#ECE1BC" ? "#E07C55" : categoryColor(name),
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Tips */}
          {tips.length > 0 && (
            <section className="rounded-[24px] bg-mint px-5 py-[18px]">
              <div className="mb-3 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-mint-ink">
                  <path d="M12 2a7 7 0 0 1 7 7c0 3-1.8 5.4-4.3 6.5L14 17H10l-.7-1.5C6.8 14.4 5 12 5 9a7 7 0 0 1 7-7Z" />
                  <path d="M10 21h4M12 17v4" />
                </svg>
                <span className="text-sm font-extrabold tracking-tight text-mint-ink">Según tus datos</span>
              </div>
              <div className="flex flex-col gap-3">
                {tips.map((tip, i) => (
                  <div key={i} className="text-sm font-medium leading-relaxed text-mint-ink">
                    {i > 0 && <div className="mb-3 border-t border-mint-ink/20" />}
                    {tip}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
