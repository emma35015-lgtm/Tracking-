// Matemática del reparto de la cuenta. Todo en centavos enteros.

export type SplitItem = {
  id: string;
  name: string;
  qty: number;
  totalCents: number;
  myUnits: number; // 0..qty — cuántas unidades pedí yo
  shared: boolean; // compartido entre varias personas
  sharedBy: number; // K >= 2
};

export type TipState = { mode: "pct"; pct: number } | { mode: "custom"; cents: number };

// Mi parte de un item:
// - normal: total * misUnidades / cantidad (precio unitario automático)
// - compartido sin unidades marcadas: total / K
// - compartido con unidades: total * misUnidades / cantidad / K
export function itemShareCents(it: SplitItem): number {
  const qty = Math.max(1, it.qty);
  if (it.shared) {
    const k = Math.max(2, it.sharedBy);
    const base = it.myUnits > 0 ? (it.totalCents * it.myUnits) / qty : it.totalCents;
    return Math.round(base / k);
  }
  return Math.round((it.totalCents * it.myUnits) / qty);
}

export function computeTotals(
  items: SplitItem[],
  tip: TipState
): { subtotalCents: number; tipCents: number; totalCents: number } {
  const subtotalCents = items.reduce((sum, it) => sum + itemShareCents(it), 0);
  // El % de propina se calcula sobre MI subtotal; "custom" es mi propina directa.
  const tipCents =
    tip.mode === "pct" ? Math.round((subtotalCents * tip.pct) / 100) : Math.max(0, tip.cents);
  return { subtotalCents, tipCents, totalCents: subtotalCents + tipCents };
}
