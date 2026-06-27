import { squarify } from "@/lib/treemap";

export type MosaicItem = {
  name: string;
  color: string;
  pct: number;
  amount: string;
  count: number;
  value: number; // monto real, para el área proporcional
};

// Proporción del contenedor (un poco más alto que ancho).
const AW = 10;
const AH = 12;

// Mosaico de categorías como treemap: las tarjetas llenan un rectángulo
// perfecto y su tamaño es proporcional al gasto.
export function CategoryTreemap({ items }: { items: MosaicItem[] }) {
  if (items.length === 0) return null;
  const tiles = squarify(
    items.map((it) => it.value),
    AW,
    AH
  );

  return (
    <div className="relative w-full overflow-hidden" style={{ aspectRatio: `${AW} / ${AH}` }}>
      {tiles.map((t) => {
        const it = items[t.index];
        const wPct = (t.w / AW) * 100;
        const hPct = (t.h / AH) * 100;
        const area = (t.w / AW) * (t.h / AH); // fracción del contenedor
        const pctSize = area > 0.18 ? 46 : area > 0.09 ? 34 : area > 0.05 ? 26 : 18;
        const nameSize = area > 0.09 ? 15 : area > 0.045 ? 13 : 11.5;
        const showMeta = hPct > 15 && wPct > 26;
        const showName = hPct > 8.5;
        return (
          <div
            key={it.name}
            className="absolute"
            style={{
              left: `${(t.x / AW) * 100}%`,
              top: `${(t.y / AH) * 100}%`,
              width: `${wPct}%`,
              height: `${hPct}%`,
            }}
          >
            <div
              className="absolute inset-[3px] flex flex-col justify-between overflow-hidden rounded-[18px] p-4 text-[#111]"
              style={{ background: it.color, animation: `pop-in .5s ${(0.05 + t.index * 0.05).toFixed(2)}s both` }}
            >
              {showName ? (
                <div className="min-w-0">
                  <div
                    className="truncate font-extrabold leading-tight tracking-[-0.01em]"
                    style={{ fontSize: nameSize }}
                  >
                    {it.name}
                  </div>
                  {showMeta && (
                    <div className="mt-0.5 truncate text-[12px] font-semibold text-black/55">
                      {it.amount} · {it.count} {it.count === 1 ? "gasto" : "gastos"}
                    </div>
                  )}
                </div>
              ) : (
                <span />
              )}
              <div
                className="font-light leading-none tracking-[-0.03em] tabular-nums"
                style={{ fontSize: pctSize }}
              >
                {it.pct}
                <span style={{ fontSize: pctSize * 0.5 }}>%</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
