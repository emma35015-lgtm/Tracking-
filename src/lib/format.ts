// Zona horaria de referencia para mostrar fechas (los datos se guardan en UTC).
const TZ = "America/Mexico_City";

export function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
  }).format(amount);
}

// Estilo del rediseño: montos redondeados, sin centavos ($1,234)
export function formatMoneyShort(amount: number, currency: string): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 0,
  }).format(amount);
}

// "2026-06-11" en la zona horaria de referencia
export function dayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

// "Hoy · 11 jun", "Ayer · 10 jun", "Mié · 9 jun"
export function formatDayLabel(key: string): string {
  const todayKey = dayKey(new Date());
  const yesterdayKey = dayKey(new Date(Date.now() - 86_400_000));
  const noon = new Date(key + "T12:00:00Z");
  const datePart = new Intl.DateTimeFormat("es-MX", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
  })
    .format(noon)
    .replace(".", "");
  let prefix: string;
  if (key === todayKey) prefix = "Hoy";
  else if (key === yesterdayKey) prefix = "Ayer";
  else {
    const wd = new Intl.DateTimeFormat("es-MX", { timeZone: "UTC", weekday: "short" })
      .format(noon)
      .replace(".", "");
    prefix = wd.charAt(0).toUpperCase() + wd.slice(1);
  }
  return `${prefix} · ${datePart}`;
}

export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: TZ,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatMonth(year: number, month: number): string {
  const label = new Intl.DateTimeFormat("es-MX", {
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 15)));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// Acepta lo que mande Atajos: 125.5, "125.50", "$125.50", "1,234.56", "125,50"
export function parseAmount(raw: unknown): number | null {
  if (typeof raw === "number") {
    return Number.isFinite(raw) && raw > 0 ? Math.round(raw * 100) / 100 : null;
  }
  if (typeof raw !== "string") return null;

  let s = raw.replace(/[^\d.,-]/g, "").trim();
  if (!s) return null;

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    // El último separador es el decimal; el otro es de miles.
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (hasComma) {
    const parts = s.split(",");
    // "1,234" → miles; "125,50" → decimal
    if (parts.length === 2 && parts[1].length !== 3) {
      s = s.replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  }

  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}
