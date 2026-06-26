import { formatMoneyShort } from "@/lib/format";
import { tripBalances } from "@/lib/trip-settle";

type Person = { id: string; name: string };
type Contribution = { person_id: string | null; amount: number };
type Expense = { amount: number };

// "Cuentas finales": a quién le toca poner o recibir. Pensado para ir dentro
// de una SectionCard de color, así que usa texto oscuro (sin título propio).
export function TripSettlement({
  people,
  contributions,
  expenses,
  currency,
}: {
  people: Person[];
  contributions: Contribution[];
  expenses: Expense[];
  currency: string;
}) {
  const { balances } = tripBalances(people, contributions, expenses);
  const fmt = (cents: number) => formatMoneyShort(cents / 100, currency);
  if (people.length === 0) return null;

  return (
    <div>
      <p className="mb-3 text-xs font-semibold text-black/45">
        A cada quien le toca {fmt(balances[0]?.shareCents ?? 0)} del gasto.
      </p>
      <div className="flex flex-col divide-y divide-black/10">
        {balances.map((b) => (
          <div key={b.id} className="flex items-center justify-between py-2.5">
            <div className="min-w-0">
              <div className="truncate text-[15px] font-bold">{b.name}</div>
              <div className="text-xs font-medium text-black/45">aportó {fmt(b.contributedCents)}</div>
            </div>
            <div className="text-right">
              {b.netCents > 0 ? (
                <span className="rounded-full bg-mint-ink px-3 py-1 text-[13px] font-bold text-mint">
                  le devuelves {fmt(b.netCents)}
                </span>
              ) : b.netCents < 0 ? (
                <span className="rounded-full bg-coral px-3 py-1 text-[13px] font-bold text-white">
                  debe {fmt(-b.netCents)}
                </span>
              ) : (
                <span className="rounded-full bg-black/10 px-3 py-1 text-[13px] font-bold text-black/60">
                  a mano
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
