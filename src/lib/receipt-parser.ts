// Parser de texto OCR de tickets mexicanos → items estructurados.
// Función pura: sin DOM, sin dependencias. Dinero en centavos enteros.

export type ParsedItem = { qty: number; name: string; totalCents: number };

export type ParsedReceipt = {
  merchant: string | null;
  items: ParsedItem[];
  subtotalCents: number | null;
  totalCents: number | null;
  tipCents: number | null;
};

// "1,234.56" | "1.234,56" | "234.56" | "$ 234.56" → centavos
function toCents(raw: string): number | null {
  let s = raw.replace(/[^\d.,]/g, "");
  if (!s) return null;
  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  if (lastDot !== -1 && lastComma !== -1) {
    if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (lastComma !== -1) {
    const decimals = s.length - lastComma - 1;
    s = decimals === 2 ? s.replace(",", ".") : s.replace(/,/g, "");
  }
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

// Corrige confusiones típicas de OCR, pero SOLO dentro de tokens que
// parecen numéricos ("18O.5O" → "180.50") para no tocar los nombres.
function fixNumericTokens(line: string): string {
  return line.replace(/(?<=^|\s)[$]?[\dOoIlSB.,]{2,}(?=\s|$)/g, (token) => {
    if (!/\d/.test(token)) return token;
    return token
      .replace(/[Oo]/g, "0")
      .replace(/[Il]/g, "1")
      .replace(/S/g, "5")
      .replace(/B/g, "8");
  });
}

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Dinero al final de la línea: 123.45 / 1,234.56 / $123.45
const PRICE_RE = /[$]?\s*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})\s*[*=]?\s*$/;

const SUBTOTAL_RE = /\bSUB\s*-?\s*TOTAL\b/;
const TOTAL_RE = /\bTOTAL\b/;
const TIP_RE = /\b(PROPINA|SERVICIO|TIP)\b/;
const SKIP_RE =
  /\b(IVA|IMPUESTO|EFECTIVO|CAMBIO|TARJETA|PAGO|VISA|MASTERCARD|MASTER CARD|AMEX|DEBITO|CREDITO|PUNTOS|DESCUENTO|AHORRO|REDONDEO|SALDO)\b/;
const NOT_MERCHANT_RE =
  /\b(RFC|S\.?\s?A\.?|C\.?\s?V\.?|CALLE|AV|AVENIDA|COL|C\.?P\.?|TEL|FOLIO|TICKET|FECHA|HORA|MESA|MESERO|CAJA|ORDEN|SUCURSAL|CLIENTE|No\.?)\b|\d{5}/;

const MAX_ITEM_CENTS = 10_000_000; // $100,000 — arriba de eso es basura de OCR

// Línea que es SOLO un precio ("$180.00") — típico del lector de Apple,
// que a veces separa la columna de nombres de la de precios.
const PRICE_ONLY_RE = /^[$]?\s*\d{1,3}(?:[.,]\d{3})*[.,]\d{2}\s*$/;

// Empareja nombres y precios cuando el OCR los devolvió en bloques separados:
// los nombres justo antes del bloque de precios, en el mismo orden.
function pairColumns(lines: string[]): { items: ParsedItem[]; totalCents: number | null } {
  const prices: { index: number; cents: number }[] = [];
  const nameCandidates: { index: number; name: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const upper = stripAccents(line).toUpperCase();
    if (SUBTOTAL_RE.test(upper) || TIP_RE.test(upper) || SKIP_RE.test(upper)) continue;
    if (TOTAL_RE.test(upper)) continue;
    if (PRICE_ONLY_RE.test(line)) {
      const cents = toCents(line);
      if (cents !== null && cents > 0 && cents <= MAX_ITEM_CENTS) prices.push({ index: i, cents });
      continue;
    }
    if (PRICE_RE.test(line)) continue; // líneas mixtas: ya las atendió el paso normal
    const letters = (line.match(/[a-zA-ZáéíóúñÁÉÍÓÚÑ]/g) ?? []).length;
    if (letters >= 3 && !NOT_MERCHANT_RE.test(upper)) {
      nameCandidates.push({ index: i, name: line });
    }
  }

  if (prices.length < 2) return { items: [], totalCents: null };

  let priceList = prices;
  let totalCents: number | null = null;
  let names = nameCandidates.filter((n) => n.index < priceList[0].index);

  // El último precio es el TOTAL si los demás suman exactamente eso,
  // o si sobra exactamente un precio respecto a los nombres.
  const sumButLast = priceList.slice(0, -1).reduce((s, p) => s + p.cents, 0);
  if (priceList.length >= 3 && sumButLast === priceList[priceList.length - 1].cents) {
    totalCents = priceList[priceList.length - 1].cents;
    priceList = priceList.slice(0, -1);
  } else if (names.length + 1 === priceList.length) {
    totalCents = priceList[priceList.length - 1].cents;
    priceList = priceList.slice(0, -1);
  }

  // Los nombres relevantes son los ÚLTIMOS N antes del bloque de precios
  // (lo anterior suele ser encabezado: nombre del lugar, dirección, mesa…)
  if (names.length > priceList.length) names = names.slice(names.length - priceList.length);
  if (names.length === 0 || names.length !== priceList.length) return { items: [], totalCents };

  const items = names.map((n, idx) => {
    let qty = 1;
    let body = n.name;
    const leadQty = body.match(/^(\d{1,2})\s+(.+)$/);
    if (leadQty) {
      qty = Math.max(1, parseInt(leadQty[1], 10));
      body = leadQty[2];
    }
    return { qty, name: body.trim(), totalCents: priceList[idx].cents };
  });
  return { items, totalCents };
}

export function parseReceipt(rawText: string): ParsedReceipt {
  const lines = rawText
    .split("\n")
    .map((l) => fixNumericTokens(l.replace(/\s+/g, " ").trim()))
    .filter(Boolean);

  const result: ParsedReceipt = {
    merchant: null,
    items: [],
    subtotalCents: null,
    totalCents: null,
    tipCents: null,
  };

  let firstItemIndex = -1;
  let sawTotal = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const upper = stripAccents(line).toUpperCase();
    const priceMatch = line.match(PRICE_RE);

    // Líneas de totales / propina / a ignorar
    if (SUBTOTAL_RE.test(upper)) {
      if (priceMatch) result.subtotalCents = toCents(priceMatch[1]);
      continue;
    }
    if (TIP_RE.test(upper)) {
      if (priceMatch) result.tipCents = toCents(priceMatch[1]);
      continue;
    }
    if (TOTAL_RE.test(upper)) {
      if (priceMatch) {
        result.totalCents = toCents(priceMatch[1]);
        sawTotal = true;
      }
      continue;
    }
    if (SKIP_RE.test(upper)) continue;
    if (sawTotal) continue; // después del TOTAL ya solo viene pago/leyendas
    if (!priceMatch) continue;

    const totalCents = toCents(priceMatch[1]);
    if (totalCents === null || totalCents <= 0 || totalCents > MAX_ITEM_CENTS) continue;

    let body = line.slice(0, priceMatch.index).trim();
    // Columna doble "2 CERVEZA 90.00 180.00": quita el precio unitario previo
    const innerPrice = body.match(/[$]?\s*\d{1,3}(?:[.,]\d{3})*[.,]\d{2}\s*$/);
    if (innerPrice) body = body.slice(0, innerPrice.index).trim();

    let qty = 1;
    // "2 CERVEZA VICTORIA"
    const leadQty = body.match(/^(\d{1,2})\s+(.+)$/);
    // "TACOS PASTOR 3"
    const trailQty = body.match(/^(.+?)\s+(\d{1,2})$/);
    if (leadQty) {
      qty = Math.max(1, parseInt(leadQty[1], 10));
      body = leadQty[2];
    } else if (trailQty) {
      qty = Math.max(1, parseInt(trailQty[2], 10));
      body = trailQty[1];
    }

    const name = body.replace(/\s+/g, " ").trim();
    // Nombre sin letras = ruido de OCR
    if (!/[a-zA-ZáéíóúñÁÉÍÓÚÑ]{2,}/.test(name)) continue;

    if (firstItemIndex === -1) firstItemIndex = i;
    result.items.push({ qty, name, totalCents });
  }

  // Si el paso por líneas casi no encontró items, intenta el modo columnas
  // (nombres y precios en bloques separados, típico del lector de Apple)
  if (result.items.length <= 1) {
    const paired = pairColumns(lines);
    if (paired.items.length > result.items.length) {
      result.items = paired.items;
      if (result.totalCents === null) result.totalCents = paired.totalCents;
    }
  }

  // Comercio: primera línea "limpia" antes del primer item
  const headerEnd = firstItemIndex === -1 ? Math.min(4, lines.length) : Math.min(4, firstItemIndex);
  for (let i = 0; i < headerEnd; i++) {
    const line = lines[i];
    const upper = stripAccents(line).toUpperCase();
    const letters = (line.match(/[a-zA-ZáéíóúñÁÉÍÓÚÑ]/g) ?? []).length;
    if (letters < 3) continue;
    if (NOT_MERCHANT_RE.test(upper)) continue;
    if (PRICE_RE.test(line)) continue;
    result.merchant = titleCase(line);
    break;
  }

  return result;
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(" ")
    .map((w) => (w.length > 2 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ")
    .replace(/^./, (c) => c.toUpperCase());
}
