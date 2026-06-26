import Link from "next/link";
import type { ReactNode } from "react";
import { formatMoneyShort } from "@/lib/format";
import type { TripPace } from "@/lib/trip-settle";

type Summary = {
  totalContributedCents: number;
  totalSpentCents: number;
  remainingCents: number;
};

// Tablero del viaje: bloques de color sobre fondo oscuro inspirado en la
// referencia. "Lo que queda en el bote" es el bloque más llamativo y el
// nombre del viaje resalta arriba. Reutilizado por la vista privada y la pública.
export function TripBoard({
  tripName,
  statusLabel,
  currency,
  summary,
  pace,
  people,
  backHref,
  topRight,
}: {
  tripName: string;
  statusLabel?: string;
  currency: string;
  summary: Summary;
  pace: TripPace;
  people: { id: string; name: string }[];
  backHref?: string;
  topRight?: ReactNode;
}) {
  const fmt = (cents: number) => formatMoneyShort(cents / 100, currency);
  const { totalContributedCents, totalSpentCents, remainingCents } = summary;
  const over = remainingCents < 0;
  const pctSpent =
    totalContributedCents > 0 ? Math.min(1, totalSpentCents / totalContributedCents) : 0;
  const pctSpentLabel = Math.round(pctSpent * 100);

  // Consejo de ritmo (Punto 3): avisa si hoy se gasta más rápido de lo usual.
  let advice: string;
  if (totalSpentCents === 0) {
    advice = "Aún no hay gastos en el bote. Cuando empiecen, aquí te aviso si van rápido.";
  } else if (over) {
    advice = "El bote ya está en rojo: se gastó más de lo aportado. Toca reponer o cerrar cuentas.";
  } else if (pace.fast) {
    const ratio = pace.avgPerDayCents > 0 ? pace.todayCents / pace.avgPerDayCents : 0;
    const r = ratio >= 2 ? `${Math.round(ratio)}×` : `${ratio.toFixed(1)}×`;
    advice = `Hoy van rápido: ${fmt(pace.todayCents)} es ${r} tu promedio (${fmt(
      pace.avgPerDayCents
    )}/día). A este ritmo el bote dura ~${pace.daysLeftAtPace} días.`;
  } else {
    advice = `Buen ritmo: ~${fmt(pace.avgPerDayCents)}/día${
      pace.daysLeftAtPace != null ? `, el bote alcanza ~${pace.daysLeftAtPace} días más` : ""
    }.`;
  }

  const initials = people.slice(0, 4);
  const extra = people.length - initials.length;

  return (
    <div className="flex flex-col gap-3" style={{ animation: "ed-in .4s ease both" }}>
      {/* Barra superior: regresar + acción (compartir / sesión) */}
      <div className="flex items-center justify-between">
        {backHref ? (
          <Link
            href={backHref}
            aria-label="Volver"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-crema"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
        ) : (
          <span />
        )}
        {topRight ?? <span />}
      </div>

      {/* Nombre del viaje (resalta) */}
      <div className="mt-1">
        <div className="text-[12px] font-bold uppercase tracking-[0.18em] text-crema/55">
          Bote de viaje{statusLabel ? ` · ${statusLabel}` : ""}
        </div>
        <h1 className="mt-1 text-[38px] font-extrabold leading-[0.95] tracking-[-0.03em] text-crema">
          {tripName}
        </h1>
        <div className="mt-1.5 text-[13px] font-medium text-crema/50">
          {people.length === 1 ? "1 persona" : `${people.length} personas`} en el bote
        </div>
      </div>

      {/* Bloque del bote — la estrella */}
      <div className="rounded-[28px] bg-coral p-6 text-white">
        <div className="text-[11px] font-bold uppercase tracking-[0.16em] opacity-90">
          {over ? "Bote en rojo" : "Queda en el bote"}
        </div>
        <div className="mt-1 text-[68px] font-light leading-[0.92] tracking-[-0.04em] tabular-nums">
          {fmt(remainingCents)}
        </div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/30">
          <div
            className="h-full rounded-full bg-white"
            style={{ width: `${Math.max(3, pctSpentLabel)}%` }}
          />
        </div>
        <div className="mt-2 text-[13px] font-semibold opacity-90">
          {fmt(totalSpentCents)} gastado de {fmt(totalContributedCents)}
        </div>
      </div>

      {/* Fila: gastado + ritmo */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[24px] p-5" style={{ background: "#a7d9bf", color: "#1e4435" }}>
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-75">Gastado</div>
          <div className="mt-1 text-[28px] font-extrabold leading-none tracking-[-0.03em] tabular-nums">
            {fmt(totalSpentCents)}
          </div>
          <div className="mt-1.5 text-[12px] font-semibold opacity-70">{pctSpentLabel}% del bote</div>
        </div>
        <div className="rounded-[24px] p-5" style={{ background: "#F4CF12", color: "#111" }}>
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-65">Ritmo</div>
          <div className="mt-1 text-[28px] font-extrabold leading-none tracking-[-0.03em] tabular-nums">
            {pace.avgPerDayCents > 0 ? fmt(pace.avgPerDayCents) : "—"}
          </div>
          <div className="mt-1.5 text-[12px] font-semibold opacity-65">por día</div>
        </div>
      </div>

      {/* Consejo */}
      <div className="rounded-[24px] p-5" style={{ background: "#9EC8E0", color: "#15314a" }}>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-70">Consejo</span>
          {pace.fast && !over && (
            <span className="rounded-full bg-coral px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white">
              ⚠︎ rápido
            </span>
          )}
        </div>
        <p className="mt-1.5 text-[15px] font-semibold leading-snug">{advice}</p>
      </div>

      {/* Compartido con */}
      {people.length > 0 && (
        <div className="flex items-center justify-between rounded-[24px] p-5" style={{ background: "#C9B8E8", color: "#2c2440" }}>
          <div className="text-[15px] font-extrabold leading-tight">
            Compartido con
            <br />
            {people.length === 1 ? "1 persona" : `${people.length} personas`}
          </div>
          <div className="flex -space-x-2.5">
            {initials.map((p) => (
              <span
                key={p.id}
                className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#C9B8E8] bg-[#2c2440] text-[13px] font-bold text-[#C9B8E8]"
              >
                {(p.name.trim()[0] ?? "?").toUpperCase()}
              </span>
            ))}
            {extra > 0 && (
              <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#C9B8E8] bg-[#2c2440] text-[12px] font-bold text-[#C9B8E8]">
                +{extra}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
