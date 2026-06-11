// Genera los íconos PNG de la PWA a partir de un SVG simple.
// Uso: node scripts/generate-icons.mjs
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#34d399"/>
      <stop offset="1" stop-color="#059669"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="116" fill="url(#g)"/>
  <text x="256" y="256" text-anchor="middle" dominant-baseline="central"
        font-family="Helvetica, Arial, sans-serif" font-size="280"
        font-weight="bold" fill="#ffffff">$</text>
</svg>`;

await mkdir("public/icons", { recursive: true });

const input = Buffer.from(svg);
await sharp(input).resize(192, 192).png().toFile("public/icons/icon-192.png");
await sharp(input).resize(512, 512).png().toFile("public/icons/icon-512.png");
// iOS recorta sus propias esquinas: fondo sólido sin transparencia
await sharp(input)
  .resize(180, 180)
  .flatten({ background: "#059669" })
  .png()
  .toFile("public/icons/apple-touch-icon.png");

console.log("Íconos generados en public/icons/");
