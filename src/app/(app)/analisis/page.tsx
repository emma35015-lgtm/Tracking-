import { createClient } from "@/lib/supabase/server";
import { formatMoneyShort } from "@/lib/format";
import { resolveMonth } from "@/lib/months";
import { MonthHeader } from "@/components/month-header";
import { categoryColor } from "@/lib/category-style";

// Bandas de color para "Según tus datos" (estilo year-in-review).
// light = texto claro (banda oscura); si no, texto tinta.
const BANDS: { bg: string; light?: boolean }[] = [
  { bg: "#F4CF12" },
  { bg: "#e0532b", light: true },
  { bg: "#1E4435", light: true },
  { bg: "#C9B8E8" },
  { bg: "#9EC8E0" },
  { bg: "#F2B79F" },
];

type Insight = { eyebrow: string; value: string; detail: string };

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

// Insights calculados sobre los datos reales del mes: etiqueta + valor + detalle.
function buildInsights(
  current: ExpenseRow[],
  previous: ExpenseRow[],
  currency: string,
  daysElapsed: number,
  daysInMonth: number
): Insight[] {
  const out: Insight[] = [];
  const total = sum(current);
  if (total === 0) return out;
  const m = (n: number) => formatMoneyShort(n, currency);

  const byCat = groupByCategory(current);
  const byCatPrev = groupByCategory(previous);

  // Proyección de cierre de mes
  if (daysElapsed >= 5 && daysElapsed < daysInMonth) {
    const projected = (total / daysElapsed) * daysInMonth;
    out.push({
      eyebrow: "Proyección del mes",
      value: m(projected),
      detail: `A este ritmo cierras el mes (llevas ${m(total)} en ${daysElapsed} días)`,
    });
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
    out.push({
      eyebrow: `${worstCat.name} subió`,
      value: `+${Math.round(worstCat.growth)}%`,
      detail: `vs el mes pasado · ${m(worstCat.now)} este mes`,
    });
  }

  // Gasto hormiga
  const small = current.filter((e) => Number(e.amount) <= 100);
  const smallTotal = sum(small);
  if (small.length >= 8 && smallTotal > total * 0.15) {
    out.push({
      eyebrow: "Gasto hormiga",
      value: m(smallTotal),
      detail: `${small.length} compras chicas · ${Math.round((smallTotal / total) * 100)}% de tu mes`,
    });
  }

  // Suscripciones anualizadas
  const subs = byCat.get("Suscripciones");
  if (subs && subs.total > 0) {
    out.push({
      eyebrow: "Suscripciones al año",
      value: m(subs.total * 12),
      detail: `${m(subs.total)} al mes · ¿las usas todas?`,
    });
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
    out.push({
      eyebrow: topMerchant[0],
      value: `${topMerchant[1].count}×`,
      detail: `tu lugar favorito · ${m(topMerchant[1].total)} este mes`,
    });
  }

  // Promedio por gasto
  if (current.length >= 4) {
    out.push({
      eyebrow: "Promedio por gasto",
      value: m(total / current.length),
      detail: `${current.length} gastos este mes`,
    });
  }

  // Día más caro del mes
  const byDay = new Map<string, number>();
  for (const e of current) {
    const k = new Date(e.occurred_at).toISOString().slice(0, 10);
    byDay.set(k, (byDay.get(k) ?? 0) + Number(e.amount));
  }
  const topDay = [...byDay.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topDay && byDay.size >= 3) {
    const label = new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", timeZone: "UTC" }).format(
      new Date(topDay[0] + "T12:00:00Z")
    );
    out.push({ eyebrow: "Tu día más caro", value: m(topDay[1]), detail: label });
  }

  // Fin de semana vs entre semana
  let weekend = 0;
  for (const e of current) {
    const wd = new Date(e.occurred_at).getUTCDay();
    if (wd === 0 || wd === 6) weekend += Number(e.amount);
  }
  if (weekend > 0 && total > 0) {
    out.push({
      eyebrow: "En fines de semana",
      value: `${Math.round((weekend / total) * 100)}%`,
      detail: `${m(weekend)} de tu gasto del mes`,
    });
  }

  // Ahorro vs el mes anterior (mes cerrado)
  const prevTotal = sum(previous);
  if (prevTotal > 0 && daysElapsed >= daysInMonth) {
    const diff = total - prevTotal;
    if (diff < 0) {
      out.push({
        eyebrow: "Ahorraste",
        value: m(Math.abs(diff)),
        detail: "menos que el mes pasado · ¡sigue así!",
      });
    }
  }

  // Regla general si hay pocos datos
  if (out.length < 2) {
    out.push({
      eyebrow: "Regla 50/30/20",
      value: "20%",
      detail: "intenta apartar a ahorro cada mes",
    });
  }

  return out;
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

  const insights = buildInsights(current, previous, currency, daysElapsed, daysInMonth);

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

          {/* Según tus datos — bandas de color a todo lo ancho */}
          {insights.length > 0 && (
            <section>
              <div className="mb-3 px-1 text-[19px] font-extrabold tracking-tight">
                Según tus datos
              </div>
              <div className="-mx-[22px] overflow-hidden">
                {insights.map((it, i) => {
                  const band = BANDS[i % BANDS.length];
                  const ink = band.light ? "#ece4d2" : "#111111";
                  return (
                    <div
                      key={i}
                      className="px-[22px] py-7"
                      style={{ background: band.bg, color: ink, animation: `ed-in .5s ${(0.05 + i * 0.07).toFixed(2)}s both` }}
                    >
                      <div className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: ink, opacity: 0.6 }}>
                        {it.eyebrow}
                      </div>
                      <div className="mt-2 text-[54px] font-light leading-[0.95] tracking-[-0.04em] tabular-nums">
                        {it.value}
                      </div>
                      <div className="mt-1.5 text-[13px] font-semibold" style={{ color: ink, opacity: 0.7 }}>
                        {it.detail}
                      </div>
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
