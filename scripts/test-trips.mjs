// Pruebas de las cuentas del bote. Correr con: npx tsx scripts/test-trips.mjs
import { tripBalances } from "../src/lib/trip-settle.ts";

let failures = 0;
function assert(cond, msg) {
  if (cond) console.log("  ✓ " + msg);
  else {
    failures++;
    console.error("  ✗ FALLA: " + msg);
  }
}

console.log("\nBote parejo (todos aportan igual):");
const people = [
  { id: "a", name: "Emma" },
  { id: "b", name: "Ana" },
  { id: "c", name: "Luis" },
];
const r1 = tripBalances(
  people,
  [
    { person_id: "a", amount: 2000 },
    { person_id: "b", amount: 2000 },
    { person_id: "c", amount: 1000 },
  ],
  [{ amount: 3000 }, { amount: 1500 }]
);
assert(r1.totalContributedCents === 500000, "aportado $5,000");
assert(r1.totalSpentCents === 450000, "gastado $4,500");
assert(r1.remainingCents === 50000, "quedan $500 en el bote");
// gasto 4500 / 3 = 1500 c/u
assert(r1.balances[0].shareCents === 150000, "a cada quien le toca $1,500");
assert(r1.balances[0].netCents === 50000, "Emma aportó $2,000 → le devuelven $500");
assert(r1.balances[2].netCents === -50000, "Luis aportó $1,000 → debe $500");
// las partes suman exactamente el gasto
assert(r1.balances.reduce((s, b) => s + b.shareCents, 0) === 450000, "las partes cuadran con el total");

console.log("\nReparto con centavos (no divisible):");
const r2 = tripBalances(
  [
    { id: "a", name: "A" },
    { id: "b", name: "B" },
    { id: "c", name: "C" },
  ],
  [{ person_id: "a", amount: 100 }],
  [{ amount: 100 }] // 10000 centavos / 3 = 3334,3333,3333
);
const sum = r2.balances.reduce((s, b) => s + b.shareCents, 0);
assert(sum === 10000, `las partes suman exacto el gasto (salió ${sum})`);
assert(r2.balances[0].shareCents === 3334, "primera parte se lleva el centavo extra");

console.log("\nSobregasto (gastaron más de lo aportado):");
const r3 = tripBalances(
  [{ id: "a", name: "A" }, { id: "b", name: "B" }],
  [{ person_id: "a", amount: 500 }, { person_id: "b", amount: 500 }],
  [{ amount: 1400 }]
);
assert(r3.remainingCents === -40000, "bote en rojo: -$400");
assert(r3.balances[0].netCents === -20000, "cada quien debe poner $200 más");

if (failures > 0) {
  console.error(`\n${failures} prueba(s) fallaron`);
  process.exit(1);
}
console.log("\nTodas las pruebas del bote pasaron ✅");
