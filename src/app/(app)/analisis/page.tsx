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

  const daysInMonth = new Date(year, month, 0).getDate();
  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month;
  const daysElapsed = isCurrentMonth ? now.getDate() : daysInMonth;
  const dailyAvg = daysElapsed > 0 ? total / daysElapsed : 0;

  const byCat = groupByCategory(current);
  const catRows = [...byCat.entries()].sort((a, b) => b[1].total - a[1].total);

  const tips = buildTips(current, previous, currency, daysElapsed, daysInMonth);

  const topCat = catRows[0] ? { name: catRows[0][0], total: catRows[0][1].total } : { name: "—", total: 0 };
  const topPct = total > 0 ? Math.round((topCat.total / total) * 100) : 0;
  const maxExpense = current.reduce((m, e) => Math.max(m, Number(e.amount)), 0);

  // Dona multicolor: un arco por categoría, en su color, apilados por fracción.
  // r=78, circunferencia ≈ 490 (coincide con la animación donut-draw).
  const R = 78;
  const C = 2 * Math.PI * R;
  let donutAcc = 0;
  const donutSegments = catRows.map(([name, { total: catTotal }], i) => {
    const frac = total > 0 ? catTotal / total : 0;
    const seg = {
      name,
      color: categoryColor(name),
      len: C * frac,
      rotation: -90 + donutAcc * 360,
      delay: (0.1 + i * 0.08).toFixed(2),
    };
    donutAcc += frac;
    return seg;
  });

  return (
    <div className="screen-in px-1 pt-2">
      <MonthHeader base="/analisis" subtitle="Análisis" year={year} month={month} prev={prev} next={next} />

      {current.length === 0 ? (
        <div className="mt-6 rounded-[22px] bg-white p-6 text-center text-sm font-medium text-muted">
          Sin gastos este mes. Cuando haya datos, aquí verás tus gráficas y tips.
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-5">
          {/* Dona multicolor */}
          <div className="pop-in flex justify-center">
            <svg width="200" height="200" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r={R} fill="none" stroke="var(--color-track)" strokeWidth="14" />
              {donutSegments.map((seg) => (
                <circle
                  key={seg.name}
                  cx="100"
                  cy="100"
                  r={R}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth="14"
                  strokeDasharray={`${seg.len} ${C}`}
                  transform={`rotate(${seg.rotation} 100 100)`}
                  style={{ animation: `donut-draw 1.1s cubic-bezier(.3,.9,.3,1) ${seg.delay}s both` }}
                />
              ))}
              <text x="100" y="90" textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--color-muted)">
                {topCat.name}
              </text>
              <text x="100" y="126" textAnchor="middle" fontSize="40" fontWeight="800" letterSpacing="-0.03em" fill="var(--color-ink)">
                {topPct}%
              </text>
            </svg>
          </div>

          {/* Dos mosaicos */}
          <div className="flex gap-[11px]">
            <div className="pop-in flex-1 rounded-[18px] border border-input-border p-4" style={{ background: "#A7D9BF" }}>
              <div className="text-xs font-semibold leading-tight text-black/60">Promedio<br />diario</div>
              <div className="my-2.5 h-0.5 w-6 bg-black" />
              <div className="text-[28px] font-extrabold leading-none tracking-[-0.03em] text-[#111] tabular-nums">
                {formatMoneyShort(dailyAvg, currency)}
              </div>
            </div>
            <div className="pop-in flex-1 rounded-[18px] border border-input-border p-4" style={{ background: "#F4CF12" }}>
              <div className="text-xs font-semibold leading-tight text-black/60">Mayor<br />gasto</div>
              <div className="my-2.5 h-0.5 w-6 bg-black" />
              <div className="text-[28px] font-extrabold leading-none tracking-[-0.03em] text-[#111] tabular-nums">
                {formatMoneyShort(maxExpense, currency)}
              </div>
            </div>
          </div>

          {/* Ranking por categoría */}
          <div>
            {catRows.slice(0, 6).map(([name, { total: catTotal }], i) => {
              const pct = total > 0 ? Math.round((catTotal / total) * 100) : 0;
              return (
                <div
                  key={name}
                  className="flex items-center gap-3.5 border-t border-crema py-3.5"
                  style={{ animation: `slide-r .5s ${(0.1 + i * 0.07).toFixed(2)}s both` }}
                >
                  <div className="h-[15px] w-[15px] flex-none rounded-[5px]" style={{ background: categoryColor(name) }} />
                  <div className="flex-1">
                    <div className="text-[15px] font-bold tracking-[-0.01em]">{name}</div>
                    <div className="text-xs font-medium text-muted">{formatMoneyShort(catTotal, currency)}</div>
                  </div>
                  <div
                    className="text-[36px] font-extrabold leading-none tracking-[-0.03em]"
                    style={{ color: i === 0 ? "#FF6518" : "var(--color-ink)" }}
                  >
                    {pct}
                    <span className="text-lg">%</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tips */}
          {tips.length > 0 && (
            <section className="rounded-[20px] px-5 py-[18px]" style={{ background: "#A7D9BF" }}>
              <div className="mb-3 text-sm font-extrabold tracking-tight text-mint-ink">Según tus datos</div>
              <div className="flex flex-col gap-3">
                {tips.map((tip, i) => (
                  <div key={i} className="text-sm font-medium leading-relaxed text-mint-ink">
                    {i > 0 && <div className="mb-3 border-t border-black/15" />}
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
