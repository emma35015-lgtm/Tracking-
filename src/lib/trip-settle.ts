// Cuentas del bote: cuánto puso cada quien vs. cuánto le tocaba del gasto total.
// Todo en centavos enteros para no arrastrar errores de flotantes.

import { dayKey } from "@/lib/format";

export type PersonBalance = {
  id: string;
  name: string;
  contributedCents: number; // lo que aportó al bote
  shareCents: number; // lo que le tocaba del gasto total
  netCents: number; // contributed - share: + le devuelven, - debe
};

// Reparte el gasto total en partes iguales entre las personas, distribuyendo
// el sobrante de centavos a las primeras para que la suma cuadre exacto.
function fairShares(totalSpentCents: number, n: number): number[] {
  if (n <= 0) return [];
  const base = Math.floor(totalSpentCents / n);
  let remainder = totalSpentCents - base * n;
  return Array.from({ length: n }, () => {
    const extra = remainder > 0 ? 1 : 0;
    remainder -= extra;
    return base + extra;
  });
}

export function tripBalances(
  people: { id: string; name: string }[],
  contributions: { person_id: string | null; amount: number }[],
  expenses: { amount: number }[]
): {
  totalContributedCents: number;
  totalSpentCents: number;
  remainingCents: number;
  balances: PersonBalance[];
} {
  const toCents = (n: number) => Math.round(n * 100);
  const totalContributedCents = contributions.reduce((s, c) => s + toCents(c.amount), 0);
  const totalSpentCents = expenses.reduce((s, e) => s + toCents(e.amount), 0);

  const contribByPerson = new Map<string, number>();
  for (const c of contributions) {
    if (!c.person_id) continue;
    contribByPerson.set(c.person_id, (contribByPerson.get(c.person_id) ?? 0) + toCents(c.amount));
  }

  const shares = fairShares(totalSpentCents, people.length);

  const balances: PersonBalance[] = people.map((p, i) => {
    const contributedCents = contribByPerson.get(p.id) ?? 0;
    const shareCents = shares[i] ?? 0;
    return {
      id: p.id,
      name: p.name,
      contributedCents,
      shareCents,
      netCents: contributedCents - shareCents,
    };
  });

  return {
    totalContributedCents,
    totalSpentCents,
    remainingCents: totalContributedCents - totalSpentCents,
    balances,
  };
}

export type TripPace = {
  avgPerDayCents: number; // promedio gastado por día activo
  todayCents: number; // gastado hoy
  daysElapsed: number; // días desde el primer gasto hasta hoy (mín. 1)
  daysLeftAtPace: number | null; // a este ritmo, cuántos días aguanta el bote
  fast: boolean; // hoy se gastó notoriamente más que el promedio
};

// Ritmo de gasto del bote: sirve para avisar si hoy se está gastando
// más rápido de lo usual y cuánto dura el bote a ese paso.
export function tripPace(
  expenses: { amount: number; occurred_at: string }[],
  remainingCents: number
): TripPace {
  const toCents = (n: number) => Math.round(n * 100);
  const totalSpentCents = expenses.reduce((s, e) => s + toCents(e.amount), 0);
  const todayKey = dayKey(new Date());

  let firstKey = todayKey;
  let todayCents = 0;
  for (const e of expenses) {
    const k = dayKey(new Date(e.occurred_at));
    if (k < firstKey) firstKey = k;
    if (k === todayKey) todayCents += toCents(e.amount);
  }

  // Días transcurridos del primer gasto a hoy, inclusive (mínimo 1).
  const ms = (key: string) => new Date(key + "T12:00:00Z").getTime();
  const daysElapsed = Math.max(1, Math.round((ms(todayKey) - ms(firstKey)) / 86_400_000) + 1);

  const avgPerDayCents = expenses.length > 0 ? Math.round(totalSpentCents / daysElapsed) : 0;
  const daysLeftAtPace =
    avgPerDayCents > 0 ? Math.max(0, Math.floor(remainingCents / avgPerDayCents)) : null;
  const fast = avgPerDayCents > 0 && todayCents > avgPerDayCents * 1.5;

  return { avgPerDayCents, todayCents, daysElapsed, daysLeftAtPace, fast };
}
