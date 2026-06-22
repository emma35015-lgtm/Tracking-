import { formatMoneyShort } from "@/lib/format";
import { tripBalances } from "@/lib/trip-settle";

type Person = { id: string; name: string };
type Contribution = { person_id: string | null; amount: number };
type Expense = { amount: number };

// Tarjeta de saldo + cuentas finales. Compartida por la vista privada y la pública.
export function TripSummary({
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
  const { totalContributedCents, totalSpentCents, remainingCents, balances } = tripBalances(
    people,
    contributions,
    expenses
  );
  const fmt = (cents: number) => formatMoneyShort(cents / 100, currency);
  const pctSpent =
    totalContributedCents > 0 ? Math.min(1, totalSpentCents / totalContributedCents) : 0;
  const over = remainingCents < 0;

  return (
    <div className="flex flex-col gap-3">
      {/* Saldo del bote */}
      <div className="rounded-[26px] bg-coral p-6 text-white">
        <div className="text-[11px] font-bold uppercase tracking-[0.16em] opacity-90">
          {over ? "Bote en rojo" : "Queda en el bote"}
        </div>
        <div className="mt-1 text-[52px] font-light leading-none tracking-[-0.04em] tabular-nums">
          {fmt(remainingCents)}
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/30">
          <div
            className="h-full rounded-full bg-white"
            style={{ width: `${Math.max(3, Math.round(pctSpent * 100))}%` }}
          />
        </div>
        <div className="mt-2 text-[13px] font-semibold opacity-90">
          {fmt(totalSpentCents)} gastado de {fmt(totalContributedCents)}
        </div>
      </div>

      {/* Cuentas finales */}
      {people.length > 0 && (
        <div className="border-t border-crema pt-5">
          <h2 className="text-[25px] font-extrabold leading-none tracking-[-0.02em]">Cuentas finales</h2>
          <p className="mb-3 mt-0.5 text-xs font-medium text-muted">
            A cada quien le toca {fmt(balances[0]?.shareCents ?? 0)} del gasto.
          </p>
          <div className="flex flex-col divide-y divide-crema">
            {balances.map((b) => (
              <div key={b.id} className="flex items-center justify-between py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-[15px] font-bold">{b.name}</div>
                  <div className="text-xs font-medium text-muted">
                    aportó {fmt(b.contributedCents)}
                  </div>
                </div>
                <div className="text-right">
                  {b.netCents > 0 ? (
                    <span className="rounded-full bg-mint px-3 py-1 text-[13px] font-bold text-mint-ink">
                      le devuelves {fmt(b.netCents)}
                    </span>
                  ) : b.netCents < 0 ? (
                    <span className="rounded-full bg-[#F8E3DC] px-3 py-1 text-[13px] font-bold text-coral-dark">
                      debe {fmt(-b.netCents)}
                    </span>
                  ) : (
                    <span className="rounded-full bg-sand px-3 py-1 text-[13px] font-bold text-muted-2">
                      a mano
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
