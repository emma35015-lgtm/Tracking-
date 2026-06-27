// Tema claro / oscuro / automático.
// El modo "auto" pone oscuro tras el atardecer y claro tras el amanecer.
// Aproximación de atardecer por mes (hora local, pensado para México/
// hemisferio norte). Suficiente para "después del atardecer" sin pedir
// permiso de ubicación.
export const SUNSET_HOUR = [18.5, 19, 19.25, 19.5, 19.75, 20, 20, 19.75, 19.25, 18.75, 18.25, 18.25];
export const SUNRISE_HOUR = 7;

export type ThemeMode = "light" | "dark" | "auto";

export function isNight(d: Date = new Date()): boolean {
  const h = d.getHours() + d.getMinutes() / 60;
  return h >= SUNSET_HOUR[d.getMonth()] || h < SUNRISE_HOUR;
}

export function readThemeMode(): ThemeMode {
  try {
    const t = localStorage.getItem("theme");
    if (t === "dark" || t === "light" || t === "auto") return t;
  } catch {}
  return "light";
}

export function applyThemeMode(mode: ThemeMode): void {
  const dark = mode === "dark" || (mode === "auto" && isNight());
  document.documentElement.classList.toggle("dark", dark);
  try {
    localStorage.setItem("theme", mode);
  } catch {}
}

// Texto amistoso de a qué hora oscurece hoy (para el modo automático).
export function sunsetLabel(d: Date = new Date()): string {
  const h = SUNSET_HOUR[d.getMonth()];
  const hr = Math.floor(h);
  const min = Math.round((h - hr) * 60);
  const date = new Date(2000, 0, 1, hr, min);
  return new Intl.DateTimeFormat("es-MX", { hour: "numeric", minute: "2-digit" }).format(date);
}
