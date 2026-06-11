// Genera los íconos PNG de la PWA a partir de un SVG simple.
// Uso: node scripts/generate-icons.mjs
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

// Paleta del rediseño "Cálido Pastel": coral sobre crema
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#E89B6C"/>
      <stop offset="1" stop-color="#D9694A"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="116" fill="url(#g)"/>
  <text x="256" y="256" text-anchor="middle" dominant-baseline="central"
        font-family="Helvetica, Arial, sans-serif" font-size="280"
        font-weight="bold" fill="#F3EAC9">$</text>
</svg>`;

await mkdir("public/icons", { recursive: true });

const input = Buffer.from(svg);
await sharp(input).resize(192, 192).png().toFile("public/icons/icon-192.png");
await sharp(input).resize(512, 512).png().toFile("public/icons/icon-512.png");
// iOS recorta sus propias esquinas: fondo sólido sin transparencia
await sharp(input)
  .resize(180, 180)
  .flatten({ background: "#E07C55" })
  .png()
  .toFile("public/icons/apple-touch-icon.png");

console.log("Íconos generados en public/icons/");
