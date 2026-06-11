// Resuelve el parámetro ?mes=YYYY-MM (default: mes actual) y su rango de fechas.
export function resolveMonth(mes?: string) {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1;

  const match = mes?.match(/^(\d{4})-(\d{2})$/);
  if (match) {
    year = Number(match[1]);
    month = Number(match[2]);
  }

  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  const prev = month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, "0")}`;
  const next = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;

  return { year, month, start, end, prev, next };
}
