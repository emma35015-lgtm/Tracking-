// Lógica financiera pura (sin BD ni React): pagos fijos y "salud" del gasto.
// El dinero llega como number en pesos; redondeos a centavo donde haga falta.

export type RecurringKind = "subscription" | "installment" | "card";

export type RecurringPayment = {
  id: string;
  kind: RecurringKind;
  name: string;
  amount: number | null;
  currency: string;
  day_of_month: number;
  category_id: string | null;
  total_months: number | null;
  start_date: string | null;
  active: boolean;
};

// Diferencia en meses calendario entre dos fechas (b - a). Ej. ene→mar = 2.
function monthsBetween(a: Date, b: Date): number {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

export type InstallmentProgress = {
  paid: number; // mensualidades ya cubiertas (incluye la del mes en curso)
  total: number;
  remaining: number; // mensualidades que faltan
  done: boolean;
  endLabel: string | null; // "mar 2027" — cuándo se termina de pagar
};

// Cuántas mensualidades llevas de una compra a meses, contando desde start_date.
export function installmentProgress(
  p: Pick<RecurringPayment, "total_months" | "start_date">,
  now: Date = new Date()
): InstallmentProgress | null {
  if (!p.total_months || !p.start_date) return null;
  const start = new Date(p.start_date + "T12:00:00");
  if (Number.isNaN(start.getTime())) return null;
  const elapsed = monthsBetween(start, now); // 0 el mes que empezaste
  const paid = Math.min(Math.max(elapsed + 1, 0), p.total_months);
  const remaining = Math.max(p.total_months - paid, 0);
  const end = new Date(start.getFullYear(), start.getMonth() + p.total_months - 1, 1);
  const endLabel = new Intl.DateTimeFormat("es-MX", { month: "short", year: "numeric" }).format(end);
  return { paid, total: p.total_months, remaining, done: remaining === 0, endLabel };
}

// ¿Sigue cobrándose este pago? Las suscripciones y tarjetas siempre; los meses
// solo mientras no se hayan terminado de pagar.
export function isActiveNow(p: RecurringPayment, now: Date = new Date()): boolean {
  if (!p.active) return false;
  if (p.kind === "installment") {
    const prog = installmentProgress(p, now);
    return prog ? !prog.done : true;
  }
  return true;
}

// Total comprometido al mes (suma de montos conocidos de lo que sigue vigente).
// La tarjeta solo cuenta si le pusiste un monto fijo.
export function monthlyCommitted(payments: RecurringPayment[], now: Date = new Date()): number {
  let sum = 0;
  for (const p of payments) {
    if (!isActiveNow(p, now)) continue;
    if (p.amount && p.amount > 0) sum += Number(p.amount);
  }
  return Math.round(sum * 100) / 100;
}

// Días desde hoy hasta el próximo "día de cobro" del mes (0 = hoy mismo).
export function daysUntilDay(dayOfMonth: number, now: Date = new Date()): number {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // Ajusta a un día válido del mes en curso (ej. 31 en febrero → último día).
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  let target = new Date(now.getFullYear(), now.getMonth(), Math.min(dayOfMonth, daysInMonth));
  if (target < today) {
    const nextDays = new Date(now.getFullYear(), now.getMonth() + 2, 0).getDate();
    target = new Date(now.getFullYear(), now.getMonth() + 1, Math.min(dayOfMonth, nextDays));
  }
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export type SpendingLevel = "ok" | "good" | "watch" | "tight" | "over";

export type SpendingStatus = {
  level: SpendingLevel;
  pct: number; // 0..(>1): (gastado + comprometido pendiente) / ingreso
  available: number; // ingreso − gastado − comprometido pendiente
  title: string;
  message: string;
};

// "Salud" del mes: combina lo ya gastado con lo que falta de pagos fijos,
// contra lo que ganas. Inspirado en dejar libre ~20% (regla 50/30/20).
export function spendingStatus(
  income: number,
  spent: number,
  committedPending: number
): SpendingStatus {
  const used = spent + committedPending;
  const available = Math.round((income - used) * 100) / 100;
  const pct = income > 0 ? used / income : 0;

  if (pct > 1) {
    return {
      level: "over",
      pct,
      available,
      title: "Te estás pasando",
      message:
        "Vas a gastar más de lo que ganas este mes. Frena los gastos que no sean indispensables.",
    };
  }
  if (pct >= 0.9) {
    return {
      level: "tight",
      pct,
      available,
      title: "Vas muy justo",
      message: "Ya casi usas todo tu ingreso. Cuida lo que queda para no quedarte corta.",
    };
  }
  if (pct >= 0.75) {
    return {
      level: "watch",
      pct,
      available,
      title: "Ojo con el ritmo",
      message: "Llevas más del 75% de tu ingreso comprometido. Baja un poco el gasto.",
    };
  }
  if (pct >= 0.5) {
    return {
      level: "good",
      pct,
      available,
      title: "Buen ritmo",
      message: "Vas bien. Si guardas lo que te queda, cierras el mes con ahorro.",
    };
  }
  return {
    level: "ok",
    pct,
    available,
    title: "Vas muy bien",
    message: "Llevas menos de la mitad de tu ingreso. Buen momento para apartar ahorro.",
  };
}

export const KIND_LABEL: Record<RecurringKind, string> = {
  subscription: "Suscripción",
  installment: "Pago a meses",
  card: "Tarjeta de crédito",
};
