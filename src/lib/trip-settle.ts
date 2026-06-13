// Cuentas del bote: cuánto puso cada quien vs. cuánto le tocaba del gasto total.
// Todo en centavos enteros para no arrastrar errores de flotantes.

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
