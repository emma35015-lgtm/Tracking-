import type { ReactNode } from "react";

// Colores pastel e íconos de línea del rediseño "Cálido Pastel",
// mapeados por nombre de categoría. Las categorías personalizadas
// caen al emoji guardado en la BD sobre fondo sand.

export const CATEGORY_COLORS: Record<string, string> = {
  Comida: "#AEC0EC",
  Transporte: "#F2C84B",
  Supermercado: "#A4D9BF",
  Suscripciones: "#E2B5DA",
  Salud: "#F2A98C",
  Otros: "#ECE1BC",
  Entretenimiento: "#C9C2F0",
  Hogar: "#F2D49B",
  Ropa: "#B8D9E8",
  Viajes: "#9FD0C4",
};

export function categoryColor(name?: string | null): string {
  return (name && CATEGORY_COLORS[name]) || "#ECE1BC";
}

type Shape =
  | ["path", string]
  | ["circle", number, number, number]
  | ["rect", number, number, number, number, number];

const ICONS: Record<string, Shape[]> = {
  Comida: [["path", "M4 3v7a2 2 0 0 0 2 2 2 2 0 0 0 2-2V3 M6 3v18 M16 3c-1.5 0-3 1.5-3 5s1.5 4 3 4v9"]],
  Transporte: [
    ["path", "M5 17h13 M7 17l1-6.5h7l1 6.5 M8.2 10.5l.4-2.5h5l.4 2.5"],
    ["circle", 8, 17.6, 1.3],
    ["circle", 16, 17.6, 1.3],
  ],
  Supermercado: [["path", "M6 8h12l-1 11H7L6 8Z M9.2 8V6a2.8 2.8 0 0 1 5.6 0v2"]],
  Suscripciones: [
    ["rect", 3, 6, 18, 13, 2.6],
    ["path", "M3 10.5h18"],
  ],
  Salud: [
    ["rect", 4, 7, 16, 12, 3],
    ["path", "M12 10v6 M9 13h6"],
  ],
  Otros: [
    ["circle", 6, 12, 1.5],
    ["circle", 12, 12, 1.5],
    ["circle", 18, 12, 1.5],
  ],
  Entretenimiento: [
    ["rect", 3, 5, 18, 14, 3],
    ["path", "M10 9l5 3-5 3z"],
  ],
  Hogar: [["path", "M4 11 12 4l8 7 M6 9.5V20h12V9.5"]],
  Ropa: [["path", "M8 4l4 3 4-3 4 4-3 3v9H7v-9L4 8z"]],
  Viajes: [["path", "M2 12l20-7-7 20-3-8-10-5z"]],
};

function renderShape(s: Shape, i: number) {
  if (s[0] === "path") return <path key={i} d={s[1]} />;
  if (s[0] === "circle") return <circle key={i} cx={s[1]} cy={s[2]} r={s[3]} />;
  return <rect key={i} x={s[1]} y={s[2]} width={s[3]} height={s[4]} rx={s[5]} />;
}

export function CategoryIcon({
  name,
  emoji,
  color = "#15140F",
  size = 22,
}: {
  name?: string | null;
  emoji?: string | null;
  color?: string;
  size?: number;
}): ReactNode {
  const spec = name ? ICONS[name] : undefined;
  if (!spec) {
    return <span style={{ fontSize: size - 4, lineHeight: 1 }}>{emoji ?? "·"}</span>;
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {spec.map(renderShape)}
    </svg>
  );
}
