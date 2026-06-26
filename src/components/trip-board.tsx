import Link from "next/link";
import type { ReactNode } from "react";
import { formatMoneyShort } from "@/lib/format";
import type { TripPace } from "@/lib/trip-settle";

type Summary = {
  totalContributedCents: number;
  totalSpentCents: number;
  remainingCents: number;
};

// Cabecera del viaje: nombre + el bloque coral del bote (la estrella).
// El consejo de ritmo va discreto dentro del bloque, no como tarjeta aparte.
export function TripBoard({
  tripName,
  statusLabel,
  currency,
  summary,
  pace,
  peopleCount,
  backHref,
  topRight,
}: {
  tripName: string;
  statusLabel?: string;
  currency: string;
  summary: Summary;
  pace: TripPace;
  peopleCount: number;
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
    advice = "Aún no hay gastos. Aquí te aviso si empiezan a ir rápido.";
  } else if (over) {
    advice = "El bote ya está en rojo: se gastó más de lo aportado.";
  } else if (pace.fast) {
    const ratio = pace.avgPerDayCents > 0 ? pace.todayCents / pace.avgPerDayCents : 0;
    const r = ratio >= 2 ? `${Math.round(ratio)}×` : `${ratio.toFixed(1)}×`;
    advice = `Hoy van rápido: ${fmt(pace.todayCents)} es ${r} tu promedio diario.`;
  } else {
    advice = `Buen ritmo, vas parejo con tu promedio diario.`;
  }

  return (
    <div className="flex flex-col gap-3" style={{ animation: "ed-in .4s ease both" }}>
      {/* Barra superior: regresar + acción (compartir / sesión) */}
      <div className="flex items-center justify-between">
        {backHref ? (
          <Link
            href={backHref}
            aria-label="Volver"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-sand text-ink"
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

      {/* Nombre del viaje — el gran protagonista */}
      <div className="mt-1 mb-1">
        <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.2em] text-muted">
          <span>Bote de viaje</span>
          {statusLabel && (
            <span className="rounded-full bg-sand px-2 py-0.5 text-[10px] tracking-wide text-muted-2">
              {statusLabel}
            </span>
          )}
        </div>
        <h1 className="mt-2 text-[64px] font-extrabold leading-[0.86] tracking-[-0.045em] text-ink">
          {tripName}
        </h1>
        <div className="mt-3 text-[14px] font-semibold text-muted">
          {peopleCount === 1 ? "1 persona" : `${peopleCount} personas`} en el bote
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

        {/* Ritmo / consejo, discreto dentro del bloque */}
        <div className="mt-4 rounded-2xl bg-white/15 px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-bold">
            <span>Ritmo {pace.avgPerDayCents > 0 ? `${fmt(pace.avgPerDayCents)}/día` : "—"}</span>
            {!over && pace.daysLeftAtPace != null && <span className="opacity-90">dura ~{pace.daysLeftAtPace} días</span>}
            {pace.fast && !over && (
              <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-coral">
                ⚠︎ rápido
              </span>
            )}
          </div>
          <p className="mt-1 text-[12px] font-medium leading-snug opacity-90">{advice}</p>
        </div>
      </div>
    </div>
  );
}
