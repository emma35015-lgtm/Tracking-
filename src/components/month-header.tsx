import Link from "next/link";
import { formatMonth } from "@/lib/format";

// Encabezado del rediseño: subtítulo + mes centrado, flechas en círculos blancos
export function MonthHeader({
  base,
  subtitle,
  year,
  month,
  prev,
  next,
}: {
  base: string;
  subtitle: string;
  year: number;
  month: number;
  prev: string;
  next: string;
}) {
  return (
    <div className="mt-2 flex items-center justify-between">
      <Link
        href={`${base}?mes=${prev}`}
        aria-label="Mes anterior"
        className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-white text-ink"
      >
        <svg width="9" height="15" viewBox="0 0 9 15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7.5 1.5 1.5 7.5l6 6" />
        </svg>
      </Link>
      <div className="text-center">
        <div className="text-[13px] font-semibold text-muted">{subtitle}</div>
        <div className="text-xl font-extrabold tracking-tight">{formatMonth(year, month)}</div>
      </div>
      <Link
        href={`${base}?mes=${next}`}
        aria-label="Mes siguiente"
        className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-white text-ink"
      >
        <svg width="9" height="15" viewBox="0 0 9 15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1.5 1.5 7.5 7.5l-6 6" />
        </svg>
      </Link>
    </div>
  );
}
