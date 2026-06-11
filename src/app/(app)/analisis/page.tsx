import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/format";
import { resolveMonth } from "@/lib/months";
import { MonthNav } from "@/components/month-nav";

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
      `📅 Llevas ${formatMoney(total, currency)} en ${daysElapsed} días. A este ritmo, cerrarás el mes en ~${formatMoney(projected, currency)}.`
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
      `📈 Ojo: ${worstCat.name} creció ${Math.round(worstCat.growth)}% vs el mes pasado (${formatMoney(worstCat.now, currency)}). Es el primer lugar donde buscar recortes.`
    );
  }

  // Gasto hormiga: muchos gastos chicos que suman
  const small = current.filter((e) => Number(e.amount) <= 100);
  const smallTotal = sum(small);
  if (small.length >= 8 && smallTotal > total * 0.15) {
    tips.push(
      `🐜 Gasto hormiga: ${small.length} compras de ${formatMoney(100, currency)} o menos suman ${formatMoney(smallTotal, currency)} (${Math.round((smallTotal / total) * 100)}% de tu mes). Son las que menos se sienten y más pesan.`
    );
  }

  // Suscripciones anualizadas
  const subs = byCat.get("Suscripciones");
  if (subs && subs.total > 0) {
    tips.push(
      `📺 Tus suscripciones cuestan ${formatMoney(subs.total, currency)} al mes — ${formatMoney(subs.total * 12, currency)} al año. ¿Las usas todas?`
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
      `🏪 Tu lugar más frecuente: ${topMerchant[0]} (${topMerchant[1].count} veces, ${formatMoney(topMerchant[1].total, currency)}). Pequeños cambios ahí tienen el mayor impacto.`
    );
  }

  // Comparación general con el mes anterior
  const prevTotal = sum(previous);
  if (prevTotal > 0 && daysElapsed >= daysInMonth) {
    const diff = total - prevTotal;
    if (diff < 0) {
      tips.push(`🎉 Gastaste ${formatMoney(Math.abs(diff), currency)} menos que el mes pasado. ¡Sigue así!`);
    }
  }

  // Regla general si hay pocos tips
  if (tips.length < 2) {
    tips.push(
      "💡 Regla 50/30/20: intenta que lo esencial sea ~50% de tu ingreso, gustos ~30% y ahorro ~20%. Compara con tu desglose de arriba."
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

  const byCat = groupByCategory(current);
  const byCatPrev = groupByCategory(previous);
  const catRows = [...byCat.entries()].sort((a, b) => b[1].total - a[1].total);

  const tips = buildTips(current, previous, currency, daysElapsed, daysInMonth);

  return (
    <div>
      <MonthNav base="/analisis" year={year} month={month} prev={prev} next={next} />

      {current.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
          Sin gastos este mes. Cuando haya datos, aquí verás tus gráficas y tips.
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Resumen comparativo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs text-zinc-500">Este mes</p>
              <p className="text-xl font-bold tabular-nums">{formatMoney(total, currency)}</p>
              {prevTotal > 0 && (
                <p className={`mt-1 text-xs font-medium ${total <= prevTotal ? "text-emerald-600" : "text-red-500"}`}>
                  {total <= prevTotal ? "▼" : "▲"}{" "}
                  {Math.abs(Math.round(((total - prevTotal) / prevTotal) * 100))}% vs mes pasado
                </p>
              )}
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs text-zinc-500">Promedio diario</p>
              <p className="text-xl font-bold tabular-nums">{formatMoney(dailyAvg, currency)}</p>
              <p className="mt-1 text-xs text-zinc-400">
                en {daysElapsed} {daysElapsed === 1 ? "día" : "días"}
              </p>
            </div>
          </div>

          {/* Gráfica: gasto por día */}
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-zinc-500">Gasto por día</h2>
            <div className="flex h-32 items-end gap-[2px]">
              {byDay.map((amount, i) => (
                <div
                  key={i}
                  className="group relative flex-1 rounded-t bg-brand/80"
                  style={{
                    height: amount > 0 ? `${Math.max(4, (amount / maxDay) * 100)}%` : "2px",
                    opacity: amount > 0 ? 1 : 0.25,
                  }}
                  title={`Día ${i + 1}: ${formatMoney(amount, currency)}`}
                />
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-zinc-400">
              <span>1</span>
              <span>{Math.round(daysInMonth / 2)}</span>
              <span>{daysInMonth}</span>
            </div>
          </section>

          {/* Categorías vs mes pasado */}
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-zinc-500">
              Categorías vs mes pasado
            </h2>
            <div className="flex flex-col gap-3">
              {catRows.map(([name, { icon, total: catTotal }]) => {
                const before = byCatPrev.get(name)?.total ?? 0;
                const pct = total > 0 ? Math.round((catTotal / total) * 100) : 0;
                return (
                  <div key={name}>
                    <div className="mb-1 flex items-baseline justify-between text-sm">
                      <span>
                        {icon} {name}{" "}
                        <span className="text-xs text-zinc-400">{pct}%</span>
                      </span>
                      <span className="tabular-nums">
                        <span className="font-medium">{formatMoney(catTotal, currency)}</span>
                        {before > 0 && (
                          <span
                            className={`ml-2 text-xs ${catTotal <= before ? "text-emerald-600" : "text-red-500"}`}
                          >
                            {catTotal <= before ? "▼" : "▲"}
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: `${Math.max(3, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Tips de ahorro */}
          {tips.length > 0 && (
            <section className="rounded-2xl bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-zinc-500">
                💡 Tips según tus datos
              </h2>
              <ul className="flex flex-col gap-3">
                {tips.map((tip, i) => (
                  <li key={i} className="rounded-xl bg-emerald-50 p-3 text-sm text-zinc-700">
                    {tip}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
