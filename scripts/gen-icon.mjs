import sharp from "sharp";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#e0532b"/>
  <text x="256" y="288" text-anchor="middle" font-family="Archivo, Helvetica, Arial, sans-serif" font-weight="800" font-size="156" letter-spacing="-8" fill="#ece4d2">COCO</text>
  <text x="256" y="346" text-anchor="middle" font-family="Archivo, Helvetica, Arial, sans-serif" font-weight="700" font-size="27" letter-spacing="7" fill="#ece4d2">GASTA CON CABEZA</text>
</svg>`;
const buf = Buffer.from(svg);
const out = async (size, path) => {
  await sharp(buf, { density: 384 }).resize(size, size).png().toFile(path);
  console.log("wrote", path, size);
};
await out(512, "public/icons/icon-512.png");
await out(192, "public/icons/icon-192.png");
await out(180, "public/icons/apple-touch-icon.png");
