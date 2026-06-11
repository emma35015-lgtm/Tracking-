import Link from "next/link";
import { formatMonth } from "@/lib/format";

export function MonthNav({
  base,
  year,
  month,
  prev,
  next,
}: {
  base: string;
  year: number;
  month: number;
  prev: string;
  next: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <Link
        href={`${base}?mes=${prev}`}
        className="rounded-full px-3 py-1 text-lg text-zinc-500"
        aria-label="Mes anterior"
      >
        ‹
      </Link>
      <h1 className="text-lg font-bold">{formatMonth(year, month)}</h1>
      <Link
        href={`${base}?mes=${next}`}
        className="rounded-full px-3 py-1 text-lg text-zinc-500"
        aria-label="Mes siguiente"
      >
        ›
      </Link>
    </div>
  );
}
