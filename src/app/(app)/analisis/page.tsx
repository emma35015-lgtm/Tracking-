import { createClient } from "@/lib/supabase/server";
import { formatMoneyShort } from "@/lib/format";
import { resolveMonth } from "@/lib/months";
import { MonthHeader } from "@/components/month-header";
import { categoryColor } from "@/lib/category-style";
import { Reveal } from "@/components/reveal";
import { InsightList, type Insight } from "@/components/insight-list";

// Colores para el puntito de cada consejo (de la paleta de la app).
const DOTS = ["#e0532b", "#1E8C63", "#C99700", "#9EC8E0", "#C9B8E8", "#D995AF", "#A7D9BF"];

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

type RawInsight = Omit<Insight, "color">;

// Insights con detalle + consejo especializado (more) para expandir.
function buildInsights(
  current: ExpenseRow[],
  previous: ExpenseRow[],
  currency: string,
  daysElapsed: number,
  daysInMonth: number
): Insight[] {
  const out: RawInsight[] = [];
  const total = sum(current);
  if (total === 0) return [];
  const m = (n: number) => formatMoneyShort(n, currency);

  const byCat = groupByCategory(current);
  const byCatPrev = groupByCategory(previous);

  if (daysElapsed >= 5 && daysElapsed < daysInMonth) {
    const projected = (total / daysElapsed) * daysInMonth;
    out.push({
      eyebrow: "Proyección del mes",
      value: m(projected),
      detail: `Llevas ${m(total)} en ${daysElapsed} días.`,
      more: "A este ritmo cerrarás el mes en ese monto. Si bajas un poco el gasto los próximos días, cierras por debajo — revisa tus categorías más altas.",
    });
  }

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
      detail: `${m(worstCat.now)} este mes vs el pasado.`,
      more: `Es donde más creció tu gasto. Ponle un límite a ${worstCat.name} este mes o busca una alternativa más barata; es el primer lugar para recortar.`,
    });
  }

  const small = current.filter((e) => Number(e.amount) <= 100);
  const smallTotal = sum(small);
  if (small.length >= 8 && smallTotal > total * 0.15) {
    out.push({
      eyebrow: "Gasto hormiga",
      value: m(smallTotal),
      detail: `${small.length} compras chicas · ${Math.round((smallTotal / total) * 100)}% de tu mes.`,
      more: "Son compras pequeñas que casi no se sienten pero suman mucho. Ponles un tope semanal o junta varias en una sola salida para gastar menos.",
    });
  }

  const subs = byCat.get("Suscripciones");
  if (subs && subs.total > 0) {
    out.push({
      eyebrow: "Suscripciones al año",
      value: m(subs.total * 12),
      detail: `${m(subs.total)} al mes en suscripciones.`,
      more: "Cancela las que no usaste este mes: cada una te ahorra su costo anual completo. Revísalas en Pagos fijos.",
    });
  }

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
      detail: `Tu lugar favorito · ${m(topMerchant[1].total)} este mes.`,
      more: `Vas muy seguido a ${topMerchant[0]}. Un pequeño cambio ahí (llevar algo de casa, comprar más grande, o ir menos veces) es donde más ahorrarías.`,
    });
  }

  if (current.length >= 4) {
    out.push({
      eyebrow: "Promedio por gasto",
      value: m(total / current.length),
      detail: `${current.length} gastos este mes.`,
      more: "Es lo que gastas en promedio cada vez. Te sirve para notar rápido cuando un gasto se sale de lo normal.",
    });
  }

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
    out.push({
      eyebrow: "Tu día más caro",
      value: m(topDay[1]),
      detail: `Fue el ${label}.`,
      more: "Ese día concentraste más gasto que cualquier otro. Si fue algo planeado, perfecto; si no, identifica qué lo detonó para no repetirlo.",
    });
  }

  let weekend = 0;
  for (const e of current) {
    const wd = new Date(e.occurred_at).getUTCDay();
    if (wd === 0 || wd === 6) weekend += Number(e.amount);
  }
  if (weekend > 0 && total > 0) {
    out.push({
      eyebrow: "En fines de semana",
      value: `${Math.round((weekend / total) * 100)}%`,
      detail: `${m(weekend)} de tu gasto del mes.`,
      more: "Los fines de semana suelen ser el punto débil. Ponte un presupuesto para sábado y domingo y verás la diferencia al cierre del mes.",
    });
  }

  const prevTotal = sum(previous);
  if (prevTotal > 0 && daysElapsed >= daysInMonth) {
    const diff = total - prevTotal;
    if (diff < 0) {
      out.push({
        eyebrow: "Ahorraste",
        value: m(Math.abs(diff)),
        detail: "menos que el mes pasado.",
        more: "Gastaste menos que el mes anterior. Aparta esa diferencia a tu ahorro ahora, antes de que se vaya en otra cosa.",
      });
    }
  }

  if (out.length < 2) {
    out.push({
      eyebrow: "Regla 50/30/20",
      value: "20%",
      detail: "Una meta simple de ahorro.",
      more: "50% para necesidades, 30% para gustos y 20% para ahorro. Compáralo con tu mosaico de categorías de arriba.",
    });
  }

  return out.map((o, i) => ({ ...o, color: DOTS[i % DOTS.length] }));
}

export default async function AnalisisPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes } = await searchParams;
  const { year, month, start, end, prev, next } = resolveMonth(mes);

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
  const prevTotal = sum(previous);

  const daysInMonth = new Date(year, month, 0).getDate();
  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month;
  const daysElapsed = isCurrentMonth ? now.getDate() : daysInMonth;
  const dailyAvg = daysElapsed > 0 ? total / daysElapsed : 0;
  const maxExpense = current.reduce((mx, e) => Math.max(mx, Number(e.amount)), 0);

  const byCat = groupByCategory(current);
  const catRows = [...byCat.entries()].sort((a, b) => b[1].total - a[1].total);
  const insights = buildInsights(current, previous, currency, daysElapsed, daysInMonth);

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
  const maxPct = mosaic.length ? Math.max(...mosaic.map((mm) => mm.pct), 1) : 1;

  const monthName = new Intl.DateTimeFormat("es-MX", { month: "long" }).format(new Date(year, month - 1, 15));
  const mood =
    prevTotal <= 0
      ? "Tu mes"
      : total <= prevTotal * 0.9
        ? "Mes tranquilo"
        : total >= prevTotal * 1.1
          ? "Mes movido"
          : "Mes parejo";

  const metrics = [
    {
      label: "Promedio diario",
      value: formatMoneyShort(dailyAvg, currency),
      icon: <><rect x="3" y="4" width="18" height="18" rx="2.5" /><path d="M3 10h18M8 2v4M16 2v4" /></>,
    },
    {
      label: "Mayor gasto",
      value: formatMoneyShort(maxExpense, currency),
      icon: <path d="M12 19V5M6 11l6-6 6 6" />,
    },
    {
      label: "Número de gastos",
      value: String(current.length),
      icon: <path d="M6 3h12v18l-2-1.5L14 21l-2-1.5L10 21l-2-1.5L6 21V3Z M9 8h6 M9 12h6" />,
    },
  ];

  return (
    <div className="screen-in px-1 pt-2">
      <MonthHeader base="/analisis" subtitle="Análisis" year={year} month={month} prev={prev} next={next} />

      {current.length === 0 ? (
        <div className="mt-6 rounded-[22px] bg-white p-6 text-center text-sm font-medium text-muted">
          Sin gastos este mes. Cuando haya datos, aquí verás tus números y consejos.
        </div>
      ) : (
        <div className="mt-2 flex flex-col gap-9">
          {/* HERO: figura de color + total gigante */}
          <div className="relative overflow-hidden pt-4">
            <div
              className="pointer-events-none absolute -right-12 -top-10 h-44 w-44 rounded-full"
              style={{ background: "#e0532b", opacity: 0.9 }}
            />
            <div className="relative">
              <div className="text-[15px] font-semibold text-muted">{mood}</div>
              <div className="count-up mt-1 text-[80px] font-light leading-[0.88] tracking-[-0.04em] tabular-nums">
                {formatMoneyShort(total, currency)}
              </div>
              <div className="mt-2 text-[13px] font-semibold text-muted">
                Gastaste en {monthName} · {year}
              </div>
            </div>
          </div>

          {/* Métricas grandes con íconos */}
          <div className="border-t border-input-border">
            {metrics.map((mt) => (
              <div key={mt.label} className="flex items-center gap-3.5 border-b border-input-border py-3.5">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted-2)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="flex-none">
                  {mt.icon}
                </svg>
                <span className="flex-1 text-[13px] font-semibold text-muted-2">{mt.label}</span>
                <span className="text-[28px] font-light leading-none tracking-[-0.03em] tabular-nums">{mt.value}</span>
              </div>
            ))}
          </div>

          {/* Mosaico de categorías */}
          <Reveal>
            <div>
              <div className="mb-3 px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Por categoría</div>
              <div className="-mx-[14px]" style={{ columns: 2, columnGap: "10px" }}>
                {mosaic.map((mm) => (
                  <div
                    key={mm.name}
                    className="mb-2.5 flex flex-col justify-between rounded-[24px] p-5 text-[#111]"
                    style={{
                      background: mm.color,
                      minHeight: 128 + Math.round((mm.pct / maxPct) * 150),
                      breakInside: "avoid",
                      animation: `pop-in .5s ${mm.delay}s both`,
                    }}
                  >
                    <div>
                      <div className="text-[15px] font-extrabold leading-tight tracking-[-0.01em]">{mm.name}</div>
                      <div className="mt-0.5 text-[12px] font-semibold text-black/55">
                        {mm.amount} · {mm.count} {mm.count === 1 ? "gasto" : "gastos"}
                      </div>
                    </div>
                    <div className="mt-6 text-[46px] font-light leading-none tracking-[-0.03em] tabular-nums">
                      {mm.pct}
                      <span className="text-[24px]">%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          {/* Según tus datos — consejos compactos y expandibles */}
          {insights.length > 0 && (
            <Reveal>
              <section>
                <div className="mb-3 px-1 text-[19px] font-extrabold tracking-tight">Según tus datos</div>
                <InsightList insights={insights} />
              </section>
            </Reveal>
          )}
        </div>
      )}
    </div>
  );
}
