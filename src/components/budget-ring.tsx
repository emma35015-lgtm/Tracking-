import { formatMoneyShort } from "@/lib/format";

// Anillo de progreso del presupuesto mensual.
// Verde mientras vas bien, coral cuando te acercas o te pasas.
export function BudgetRing({
  spent,
  budget,
  currency,
}: {
  spent: number;
  budget: number;
  currency: string;
}) {
  const pct = budget > 0 ? spent / budget : 0;
  const clamped = Math.min(1, pct);
  const over = spent > budget;
  const remaining = budget - spent;

  const size = 150;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const dash = clamped * circumference;

  const ringColor = over ? "#C9533A" : pct >= 0.85 ? "#E07C55" : "#3FA37A";

  return (
    <div className="flex items-center gap-5 rounded-[26px] bg-white p-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EFE6C6" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={ringColor}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[26px] font-extrabold leading-none tracking-tight tabular-nums" style={{ color: ringColor }}>
            {Math.round(pct * 100)}%
          </span>
          <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-muted">
            del presupuesto
          </span>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium text-muted">Presupuesto del mes</div>
        <div className="text-2xl font-extrabold leading-tight tracking-tight tabular-nums">
          {formatMoneyShort(budget, currency)}
        </div>
        {over ? (
          <div className="mt-2 inline-block rounded-full bg-[#F8E3DC] px-3 py-1 text-[13px] font-bold text-coral-dark">
            Te pasaste {formatMoneyShort(-remaining, currency)} 😬
          </div>
        ) : (
          <div className="mt-2 inline-block rounded-full bg-mint px-3 py-1 text-[13px] font-bold text-mint-ink">
            Te quedan {formatMoneyShort(remaining, currency)}
          </div>
        )}
      </div>
    </div>
  );
}
