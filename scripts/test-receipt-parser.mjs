// Pruebas del parser de tickets y la matemática de reparto.
// Correr con: npx tsx scripts/test-receipt-parser.mjs
import { parseReceipt } from "../src/lib/receipt-parser.ts";
import { itemShareCents, computeTotals } from "../src/lib/split-math.ts";

let failures = 0;
function assert(cond, msg) {
  if (cond) {
    console.log("  ✓ " + msg);
  } else {
    failures++;
    console.error("  ✗ FALLA: " + msg);
  }
}

// ── Ticket 1: taquería con qty al inicio ─────────────────────────
console.log("\nTicket taquería:");
const t1 = parseReceipt(`
TAQUERIA EL GUERO
AV INSURGENTES 123 COL ROMA
RFC GUE850101XX1
MESA 4   MESERO: PEPE
2 CERVEZA VICTORIA  $180.00
3 TACO PASTOR  135.00
1 GUACAMOLE  95.00
QUESADILLA  55.00
SUB-TOTAL  465.00
PROPINA SUGERIDA 10%  46.50
TOTAL  $465.00
EFECTIVO  500.00
CAMBIO  35.00
`);
assert(t1.merchant === "Taqueria el Guero", `comercio detectado: ${t1.merchant}`);
assert(t1.items.length === 4, `4 items (salieron ${t1.items.length})`);
assert(t1.items[0].qty === 2 && t1.items[0].totalCents === 18000, "2 cervezas $180.00");
assert(t1.items[1].qty === 3 && t1.items[1].totalCents === 13500, "3 tacos $135.00");
assert(t1.items[3].qty === 1 && t1.items[3].name.toLowerCase().includes("quesadilla"), "quesadilla qty default 1");
assert(t1.subtotalCents === 46500, "subtotal $465.00");
assert(t1.totalCents === 46500, "total $465.00");
assert(t1.tipCents === 4650, "propina sugerida $46.50");

// ── Ticket 2: qty al final, columnas unitario + extendido ────────
console.log("\nTicket columnas:");
const t2 = parseReceipt(`
RESTAURANTE LA CASA
TACOS PASTOR 3 135.00
CERVEZA 2 90.00 180.00
AGUA FRESCA 25.00
TOTAL 340.00
TARJETA VISA ****1234
`);
assert(t2.merchant === "Restaurante la Casa", `comercio: ${t2.merchant}`);
assert(t2.items.length === 3, `3 items (salieron ${t2.items.length})`);
assert(t2.items[0].qty === 3 && t2.items[0].totalCents === 13500, "tacos qty al final");
assert(t2.items[1].qty === 2 && t2.items[1].totalCents === 18000, "cerveza toma el precio extendido (180), no el unitario");
assert(t2.totalCents === 34000, "total $340.00");

// ── Ticket 3: ruido de OCR en números ────────────────────────────
console.log("\nTicket con ruido OCR:");
const t3 = parseReceipt(`
CAFE PUNTA
1 LATTE GRANDE 8O.5O
1 CROISSANT 45.00
TOTAL 125.5O
`);
assert(t3.items.length === 2, `2 items (salieron ${t3.items.length})`);
assert(t3.items[0].totalCents === 8050, `latte "8O.5O" → $80.50 (salió ${t3.items[0]?.totalCents})`);
assert(t3.totalCents === 12550, `total "125.5O" → $125.50 (salió ${t3.totalCents})`);

// ── Ticket 4: basura y líneas sin precio ─────────────────────────
console.log("\nTicket con basura:");
const t4 = parseReceipt(`
||| ~~~ %%%%
GRACIAS POR SU VISITA
2 REFRESCO 60.00
!@# 999
SIN PRECIO EN ESTA LINEA
IVA INCLUIDO 16% 8.28
TOTAL 60.00
`);
assert(t4.items.length === 1, `solo 1 item real (salieron ${t4.items.length})`);
assert(t4.items[0].totalCents === 6000, "refresco $60.00");

// ── Ticket 5: después del TOTAL no se capturan items ─────────────
console.log("\nTicket pago después del total:");
const t5 = parseReceipt(`
1 HAMBURGUESA 150.00
TOTAL 150.00
SU PAGO 200.00
SU CAMBIO 50.00
PUNTOS GANADOS 15.00
`);
assert(t5.items.length === 1, `nada después del TOTAL (salieron ${t5.items.length})`);

// ── Matemática de reparto ────────────────────────────────────────
console.log("\nSplit math:");
const beer = { id: "a", name: "Cerveza", qty: 4, totalCents: 24000, myUnits: 1, shared: false, sharedBy: 2 };
assert(itemShareCents(beer) === 6000, "4 cervezas $240, yo pedí 1 → $60");

const guac = { id: "b", name: "Guacamole", qty: 1, totalCents: 10000, myUnits: 0, shared: true, sharedBy: 3 };
assert(itemShareCents(guac) === 3333, "$100 entre 3 → $33.33");

const combo = { id: "c", name: "Alitas", qty: 2, totalCents: 20000, myUnits: 1, shared: true, sharedBy: 2 };
assert(itemShareCents(combo) === 5000, "2 alitas $200, 1 mía compartida entre 2 → $50");

const none = { id: "d", name: "Postre", qty: 1, totalCents: 9000, myUnits: 0, shared: false, sharedBy: 2 };
assert(itemShareCents(none) === 0, "no pedí nada → $0");

const totals = computeTotals([beer, guac], { mode: "pct", pct: 15 });
assert(totals.subtotalCents === 9333, `subtotal 6000+3333 (salió ${totals.subtotalCents})`);
assert(totals.tipCents === 1400, `propina 15% de 9333 → 1400 (salió ${totals.tipCents})`);
assert(totals.totalCents === 10733, "total con propina");

const customTip = computeTotals([beer], { mode: "custom", cents: 2500 });
assert(customTip.tipCents === 2500 && customTip.totalCents === 8500, "propina manual $25");

// ─────────────────────────────────────────────────────────────────
if (failures > 0) {
  console.error(`\n${failures} prueba(s) fallaron`);
  process.exit(1);
}
console.log("\nTodas las pruebas pasaron ✅");
