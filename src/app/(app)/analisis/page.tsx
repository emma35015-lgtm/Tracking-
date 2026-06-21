import { createClient } from "@/lib/supabase/server";
import { formatMoney, formatMoneyShort } from "@/lib/format";
import { resolveMonth } from "@/lib/months";
import { MonthHeader } from "@/components/month-header";
import { categoryColor } from "@/lib/category-style";

// Colores rotativos para las tarjetas de tips ("Según tus datos").
const TIP_COLORS = ["#A7D9BF", "#9EC8E0", "#F2B79F", "#C9B8E8", "#F4CF12"];

type ExpenseRow = {
  amount: number;
  currency: string;
  merchant: string | null;
  occurred_at: string;
  source: string;
  categories: { name: string; icon: string; color: string | null } | null;
};

function sum(list: ExpenseRow[]) {
  return list.reduce((acc, e) => acc + Number(e.amount), 0);
}

function groupByCategory(list: ExpenseRow[]) {
  const map = new Map<string, { icon: string; total: number; count: number; color: string | null }>();
  for (const e of list) {
    const name = e.categories?.name ?? "Sin categoría";
    const icon = e.categories?.icon ?? "❓";
    const entry = map.get(name) ?? { icon, total: 0, count: 0, color: e.categories?.color ?? null };
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
    .select("amount, currency, merchant, occurred_at, source, categories(name, icon, color)")
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

  const maxExpense = current.reduce((m, e) => Math.max(m, Number(e.amount)), 0);

  // Mosaico de categorías: cada ficha de su color, alto según su % del mes.
  const mosaic = catRows.map(([name, { total: catTotal, count, color }], i) => {
    const pct = total > 0 ? Math.round((catTotal / total) * 100) : 0;
    return {
      name,
      color: categoryColor(name, color),
      pct,
      amount: formatMoneyShort(catTotal, currency),
      count,
      delay: (0.05 + i * 0.05).toFixed(2),
    };
  });
  const maxPct = mosaic.length ? Math.max(...mosaic.map((m) => m.pct), 1) : 1;

  return (
    <div className="screen-in px-1 pt-2">
      <MonthHeader base="/analisis" subtitle="Análisis" year={year} month={month} prev={prev} next={next} />

      {current.length === 0 ? (
        <div className="mt-6 rounded-[22px] bg-white p-6 text-center text-sm font-medium text-muted">
          Sin gastos este mes. Cuando haya datos, aquí verás tus gráficas y tips.
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-8">
          {/* Stats abiertos sobre el crema */}
          <div className="flex">
            <div className="flex-1">
              <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Promedio diario</div>
              <div className="mt-2 text-[32px] font-light leading-none tracking-[-0.03em] tabular-nums" style={{ color: "#1E8C63" }}>
                {formatMoneyShort(dailyAvg, currency)}
              </div>
            </div>
            <div className="w-px self-stretch bg-track" />
            <div className="flex-1 pl-5">
              <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Mayor gasto</div>
              <div className="mt-2 text-[32px] font-light leading-none tracking-[-0.03em] tabular-nums" style={{ color: "#C99700" }}>
                {formatMoneyShort(maxExpense, currency)}
              </div>
            </div>
          </div>

          {/* Mosaico de categorías */}
          <div>
            <div className="mb-3 px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Por categoría</div>
            <div className="-mx-[14px]" style={{ columns: 2, columnGap: "10px" }}>
              {mosaic.map((m) => (
                <div
                  key={m.name}
                  className="mb-2.5 flex flex-col justify-between rounded-[24px] p-5 text-[#111]"
                  style={{
                    background: m.color,
                    minHeight: 128 + Math.round((m.pct / maxPct) * 150),
                    breakInside: "avoid",
                    animation: `pop-in .5s ${m.delay}s both`,
                  }}
                >
                  <div>
                    <div className="text-[15px] font-extrabold leading-tight tracking-[-0.01em]">{m.name}</div>
                    <div className="mt-0.5 text-[12px] font-semibold text-black/55">
                      {m.amount} · {m.count} {m.count === 1 ? "gasto" : "gastos"}
                    </div>
                  </div>
                  <div className="mt-6 text-[46px] font-light leading-none tracking-[-0.03em] tabular-nums">
                    {m.pct}
                    <span className="text-[24px]">%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tips — fichas de color encimadas */}
          {tips.length > 0 && (
            <section>
              <div className="mb-3 px-1 text-[19px] font-extrabold tracking-tight">
                Según tus datos
              </div>
              <div className="-mx-[14px]">
                {tips.map((tip, i) => {
                  const tipColor = TIP_COLORS[i % TIP_COLORS.length];
                  return (
                    <div
                      key={i}
                      className="relative rounded-[26px] px-6 pb-5 pt-5"
                      style={{
                        background: tipColor,
                        marginTop: i === 0 ? 0 : -20,
                        zIndex: i + 1,
                        boxShadow: "0 -10px 24px -12px rgba(0,0,0,0.28)",
                        animation: `slide-r .5s ${(0.06 + i * 0.07).toFixed(2)}s both`,
                      }}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/12">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111111" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 18h6M10 21h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2h6c0-.8.4-1.5 1-2A7 7 0 0 0 12 2Z" />
                        </svg>
                      </div>
                      <div className="mt-3 text-[15px] font-semibold leading-relaxed text-[#111]">{tip}</div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
