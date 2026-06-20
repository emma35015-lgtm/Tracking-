"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { addExpense } from "@/app/(app)/actions";
import { formatMoney, parseAmount } from "@/lib/format";
import { parseReceipt } from "@/lib/receipt-parser";
import { itemShareCents, computeTotals, type SplitItem, type TipState } from "@/lib/split-math";
import { CategoryIcon, categoryColor } from "@/lib/category-style";

type Step = "capturar" | "leyendo" | "revisar" | "asignar" | "resultado";

// Fila editable: textos crudos mientras se edita + estado de asignación
type Row = {
  id: string;
  name: string;
  qtyText: string;
  priceText: string;
  myUnits: number;
  shared: boolean;
  sharedBy: number;
};

let rowSeq = 0;
function newRow(partial: Partial<Row> = {}, defaultPeople = 2): Row {
  return {
    id: `r${++rowSeq}`,
    name: "",
    qtyText: "1",
    priceText: "",
    myUnits: 0,
    shared: false,
    sharedBy: defaultPeople,
    ...partial,
  };
}

function rowQty(row: Row): number {
  const n = parseInt(row.qtyText, 10);
  return Number.isFinite(n) && n >= 1 ? Math.min(99, n) : 1;
}

function rowCents(row: Row): number {
  const n = parseAmount(row.priceText);
  return n === null ? 0 : Math.round(n * 100);
}

function toSplitItem(row: Row): SplitItem {
  const qty = rowQty(row);
  return {
    id: row.id,
    name: row.name,
    qty,
    totalCents: rowCents(row),
    myUnits: Math.min(row.myUnits, qty),
    shared: row.shared,
    sharedBy: row.sharedBy,
  };
}

function Stepper({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border-[1.6px] border-input-border bg-input">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="h-9 w-9 rounded-full text-lg font-bold text-ink disabled:opacity-30"
        disabled={value <= min}
      >
        −
      </button>
      <span className="min-w-6 text-center text-base font-extrabold tabular-nums">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        className="h-9 w-9 rounded-full text-lg font-bold text-ink disabled:opacity-30"
        disabled={value >= max}
      >
        +
      </button>
    </div>
  );
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="mb-3 text-sm font-bold text-coral-link">
      ← Atrás
    </button>
  );
}

const TIP_OPTIONS = [0, 10, 15, 20];

export function SplitFlow({
  categories,
  currency,
  defaultCategoryId,
}: {
  categories: { id: string; name: string; icon: string; color?: string | null }[];
  currency: string;
  defaultCategoryId: string;
}) {
  const [step, setStep] = useState<Step>("capturar");
  const [merchant, setMerchant] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [ticketTotalCents, setTicketTotalCents] = useState<number | null>(null);
  const [defaultPeople, setDefaultPeople] = useState(2);
  const [tip, setTip] = useState<TipState>({ mode: "pct", pct: 10 });
  const [customTipText, setCustomTipText] = useState("");
  const [showCustomTip, setShowCustomTip] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState(defaultCategoryId);

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const cancelledRef = useRef(false);

  const fmt = (cents: number) => formatMoney(cents / 100, currency);

  function updateRow(id: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  // Convierte texto de ticket (del OCR o pegado) en filas editables
  function seedFromText(text: string): number {
    const parsed = parseReceipt(text);
    if (parsed.merchant && !merchant) setMerchant(parsed.merchant);
    setTicketTotalCents(parsed.totalCents ?? parsed.subtotalCents);
    const parsedRows = parsed.items.map((it) =>
      newRow(
        {
          name: it.name,
          qtyText: String(it.qty),
          priceText: (it.totalCents / 100).toFixed(2),
        },
        defaultPeople
      )
    );
    setRows((prev) => [...prev, ...parsedRows]);
    return parsedRows.length;
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    cancelledRef.current = false;
    setOcrProgress(0);
    setOcrError(null);
    setStep("leyendo");
    try {
      const { ocrReceipt } = await import("@/lib/ocr");
      const text = await ocrReceipt(file, (p) => setOcrProgress(p));
      if (cancelledRef.current) return;
      const count = seedFromText(text);
      if (count === 0) {
        setOcrError("No pude leer artículos en la foto. Prueba la opción de pegar el texto (lee mucho mejor), o captúralos a mano.");
      }
      setStep("revisar");
    } catch {
      if (cancelledRef.current) return;
      setOcrError("Algo falló leyendo la foto. Prueba la opción de pegar el texto, o captura a mano.");
      setStep("revisar");
    }
  }

  // Texto copiado con el lector de Apple (Fotos → seleccionar texto → Copiar):
  // mucho más preciso que el OCR del navegador en tickets térmicos.
  async function handlePaste() {
    setOcrError(null);
    let text = "";
    try {
      text = await navigator.clipboard.readText();
    } catch {
      setOcrError("No pude leer lo copiado. Toca \"Permitir pegar\" cuando tu iPhone lo pregunte, e intenta de nuevo.");
      setStep("revisar");
      return;
    }
    if (!text.trim()) {
      setOcrError("No hay nada copiado. Ve a Fotos, mantén presionado el texto del ticket, Seleccionar todo → Copiar, y regresa aquí.");
      setStep("revisar");
      return;
    }
    const count = seedFromText(text);
    if (count === 0) {
      setOcrError("No encontré productos con precio en el texto copiado. Revisa que copiaras los renglones del ticket, o captúralos a mano.");
    }
    setStep("revisar");
  }

  // ─────────────────────── CAPTURAR ───────────────────────
  if (step === "capturar") {
    return (
      <div className="mt-4 flex flex-col gap-3">
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="flex items-center gap-4 rounded-[26px] bg-white p-5 text-left"
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-coral">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 8a2 2 0 0 1 2-2h1.5l1.5-2h8l1.5 2H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Z" />
              <circle cx="12" cy="13" r="3.5" />
            </svg>
          </div>
          <div>
            <div className="text-lg font-extrabold tracking-tight">Foto del ticket</div>
            <div className="text-[13px] font-medium text-muted">
              Lo leemos y separamos los productos solos
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => galleryRef.current?.click()}
          className="text-center text-sm font-bold text-coral-link"
        >
          O elegir una foto de la galería
        </button>

        <button
          type="button"
          onClick={handlePaste}
          className="flex items-center gap-4 rounded-[26px] bg-white p-5 text-left"
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-ink">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <rect x="6" y="4" width="12" height="17" rx="2.5" />
              <path d="M9 4V3a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 3v1 M9.5 10h5 M9.5 14h5" />
            </svg>
          </div>
          <div>
            <div className="text-lg font-extrabold tracking-tight">
              Pegar texto del ticket{" "}
              <span className="rounded-full bg-mint px-2 py-0.5 text-[10px] font-bold text-mint-ink align-middle">
                MÁS PRECISO
              </span>
            </div>
            <div className="text-[13px] font-medium text-muted">
              Usa el lector de Apple: lee mejor los tickets
            </div>
          </div>
        </button>

        <div className="rounded-[18px] bg-sand px-4 py-3 text-xs font-medium leading-relaxed text-muted-2">
          💡 <strong>Cómo copiar el texto:</strong> tómale foto al ticket con la Cámara
          normal → ábrela en <strong>Fotos</strong> → mantén presionado sobre el texto →{" "}
          <strong>Seleccionar todo</strong> → <strong>Copiar</strong> → regresa aquí y toca
          &quot;Pegar texto del ticket&quot;.
        </div>

        <button
          type="button"
          onClick={() => {
            if (rows.length === 0) setRows([newRow({}, defaultPeople)]);
            setStep("revisar");
          }}
          className="flex items-center gap-4 rounded-[22px] bg-sand p-5 text-left"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] bg-white">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#15140F" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 20l4-1L20 7l-3-3L5 16l-1 4Z" />
            </svg>
          </div>
          <div>
            <div className="text-base font-extrabold tracking-tight">Escribir a mano</div>
            <div className="text-[13px] font-medium text-muted-2">Sin foto: captura los productos tú</div>
          </div>
        </button>

        <div className="rounded-[22px] bg-mint px-5 py-4 text-[13px] font-medium leading-relaxed text-mint-ink">
          🔒 Todo se procesa en tu teléfono. La foto del ticket nunca sale de aquí.
        </div>
      </div>
    );
  }

  // ─────────────────────── LEYENDO ───────────────────────
  if (step === "leyendo") {
    return (
      <div className="mt-4">
        <div className="px-1">
          <div className="text-lg font-extrabold tracking-tight">Leyendo tu ticket…</div>
          <div className="mt-1 text-[13px] font-medium text-muted">
            La primera vez tarda un poco más mientras se descarga el lector.
          </div>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-track">
            <div
              className="h-full rounded-full bg-coral transition-all duration-300"
              style={{ width: `${Math.max(4, Math.round(ocrProgress * 100))}%` }}
            />
          </div>
          <div className="mt-2 text-right text-sm font-extrabold tabular-nums text-coral-link">
            {Math.round(ocrProgress * 100)}%
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            cancelledRef.current = true;
            setStep("capturar");
          }}
          className="mt-4 w-full text-center text-sm font-bold text-coral-link"
        >
          Cancelar
        </button>
      </div>
    );
  }

  // ─────────────────────── REVISAR ───────────────────────
  if (step === "revisar") {
    const validRows = rows.filter((r) => rowCents(r) > 0 && r.name.trim());
    const runningCents = validRows.reduce((sum, r) => sum + rowCents(r), 0);
    const matches = ticketTotalCents !== null && runningCents === ticketTotalCents;

    return (
      <div className="mt-2">
        <BackLink onClick={() => setStep("capturar")} />

        {ocrError && (
          <div className="mb-3 rounded-[18px] bg-sand px-4 py-3 text-[13px] font-medium text-muted-2">
            {ocrError}
          </div>
        )}

        <div className="mb-2 text-[13px] font-bold text-muted-2">Lugar</div>
        <input
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
          placeholder="Restaurante, bar…"
          className="w-full rounded-2xl border-[1.6px] border-input-border bg-input px-4 py-3 text-[15px] font-medium outline-none focus:border-coral"
        />

        <div className="mb-2 mt-4 text-[13px] font-bold text-muted-2">
          Productos <span className="font-medium text-muted">(corrige lo que el lector no agarró bien)</span>
        </div>
        <div className="flex flex-col gap-2">
          {rows.map((row) => (
            <div key={row.id} className="border-b border-crema pb-3">
              <div className="flex items-center gap-2">
                <input
                  value={row.name}
                  onChange={(e) => updateRow(row.id, { name: e.target.value })}
                  placeholder="Producto"
                  className="min-w-0 flex-1 rounded-xl border-[1.6px] border-input-border bg-input px-3 py-2 text-sm font-medium outline-none focus:border-coral"
                />
                <button
                  type="button"
                  onClick={() => setRows((rs) => rs.filter((r) => r.id !== row.id))}
                  aria-label="Eliminar"
                  className="px-1 text-lg font-bold text-muted"
                >
                  ×
                </button>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs font-bold text-muted-2">
                  Cant.
                  <input
                    value={row.qtyText}
                    onChange={(e) => updateRow(row.id, { qtyText: e.target.value })}
                    inputMode="numeric"
                    className="w-12 rounded-xl border-[1.6px] border-input-border bg-input px-2 py-2 text-center text-sm font-bold tabular-nums outline-none focus:border-coral"
                  />
                </label>
                <label className="flex flex-1 items-center gap-1.5 text-xs font-bold text-muted-2">
                  Precio total
                  <input
                    value={row.priceText}
                    onChange={(e) => updateRow(row.id, { priceText: e.target.value })}
                    inputMode="decimal"
                    placeholder="0.00"
                    className="w-full min-w-0 flex-1 rounded-xl border-[1.6px] border-input-border bg-input px-3 py-2 text-sm font-bold tabular-nums outline-none focus:border-coral"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setRows((rs) => [...rs, newRow({}, defaultPeople)])}
          className="mt-2 w-full rounded-[18px] border-[1.6px] border-dashed border-input-border py-3 text-sm font-bold text-muted-2"
        >
          + Agregar producto
        </button>

        {runningCents > 0 && (
          <div
            className="mt-3 text-center text-[13px] font-bold"
            style={{ color: matches ? "#1E4435" : "#8A8167" }}
          >
            {ticketTotalCents !== null
              ? `Ticket dice ${fmt(ticketTotalCents)} · llevas ${fmt(runningCents)}${matches ? " ✓" : ""}`
              : `Suma: ${fmt(runningCents)}`}
          </div>
        )}

        <button
          type="button"
          disabled={validRows.length === 0}
          onClick={() => {
            setRows(validRows);
            setStep("asignar");
          }}
          className="mt-4 h-[58px] w-full rounded-[18px] bg-coral text-lg font-extrabold tracking-tight text-white disabled:opacity-40"
        >
          Continuar
        </button>
      </div>
    );
  }

  // ─────────────────────── ASIGNAR ───────────────────────
  if (step === "asignar") {
    const myTotal = rows.reduce((sum, r) => sum + itemShareCents(toSplitItem(r)), 0);

    return (
      <div className="mt-2 pb-20">
        <BackLink onClick={() => setStep("revisar")} />

        <div className="flex items-center justify-between border-y border-crema py-4">
          <div>
            <div className="text-[15px] font-extrabold tracking-tight">¿Cuántas personas?</div>
            <div className="text-xs font-medium text-muted">Para lo que compartieron</div>
          </div>
          <Stepper
            value={defaultPeople}
            min={2}
            max={20}
            onChange={(v) => {
              setRows((rs) => rs.map((r) => (r.sharedBy === defaultPeople ? { ...r, sharedBy: v } : r)));
              setDefaultPeople(v);
            }}
          />
        </div>

        <div className="mb-2 mt-5 text-[13px] font-bold text-muted-2">Marca lo que pediste tú</div>
        <div className="flex flex-col gap-2.5">
          {rows.map((row) => {
            const qty = rowQty(row);
            const share = itemShareCents(toSplitItem(row));
            return (
              <div key={row.id} className="border-b border-crema pb-4">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="min-w-0 flex-1 truncate text-[15px] font-bold tracking-tight">
                    {row.name}
                    {qty > 1 && <span className="ml-1 text-xs font-semibold text-muted">×{qty}</span>}
                  </div>
                  <div className="text-[13px] font-semibold tabular-nums text-muted">
                    {fmt(rowCents(row))}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-2">Yo pedí</span>
                    <Stepper
                      value={Math.min(row.myUnits, qty)}
                      min={0}
                      max={qty}
                      onChange={(v) => updateRow(row.id, { myUnits: v })}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => updateRow(row.id, { shared: !row.shared })}
                    className="rounded-full px-3 py-2 text-xs font-bold transition-all"
                    style={{
                      border: `1.6px solid ${row.shared ? "#FF6518" : "var(--color-input-border)"}`,
                      background: row.shared ? "#FF6518" : "transparent",
                      color: "#111111",
                    }}
                  >
                    Compartido
                  </button>
                  {row.shared && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-muted-2">entre</span>
                      <Stepper
                        value={row.sharedBy}
                        min={2}
                        max={20}
                        onChange={(v) => updateRow(row.id, { sharedBy: v })}
                      />
                    </div>
                  )}
                </div>
                {share > 0 && (
                  <div className="mt-2 text-right text-sm font-extrabold tabular-nums text-coral-link">
                    Tu parte: {fmt(share)}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Barra resumen sticky */}
        <div className="fixed inset-x-0 bottom-[104px] z-30 px-[18px]">
          <div className="mx-auto max-w-lg">
            <button
              type="button"
              disabled={myTotal === 0}
              onClick={() => setStep("resultado")}
              className="flex h-[56px] w-full items-center justify-between rounded-[18px] bg-ink px-5 text-white shadow-[0_16px_36px_-10px_rgba(0,0,0,0.45)] disabled:opacity-50"
            >
              <span className="text-sm font-bold">
                Tu parte: <span className="text-base font-extrabold tabular-nums">{fmt(myTotal)}</span>
              </span>
              <span className="text-base font-extrabold">Continuar →</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────── RESULTADO ───────────────────────
  const totals = computeTotals(rows.map(toSplitItem), tip);

  return (
    <div className="mt-2">
      <BackLink onClick={() => setStep("asignar")} />

      <div className="px-1 py-4 text-center">
        <div className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Te toca pagar</div>
        <div className="mt-2 text-[64px] font-light leading-none tracking-[-0.04em] tabular-nums">
          {fmt(totals.totalCents)}
        </div>
        <div className="mt-3 text-[13px] font-medium text-muted-2">
          Lo tuyo {fmt(totals.subtotalCents)} + propina {fmt(totals.tipCents)}
        </div>
      </div>

      <div className="mb-2 mt-5 text-[13px] font-bold text-muted-2">Propina (sobre tu parte)</div>
      <div className="flex flex-wrap gap-2">
        {TIP_OPTIONS.map((pct) => {
          const selected = tip.mode === "pct" && tip.pct === pct;
          return (
            <button
              key={pct}
              type="button"
              onClick={() => {
                setTip({ mode: "pct", pct });
                setShowCustomTip(false);
              }}
              className="rounded-full px-4 py-2.5 text-sm font-bold transition-all"
              style={{
                border: `1.6px solid ${selected ? "#FF6518" : "var(--color-input-border)"}`,
                background: selected ? "#FF6518" : "transparent",
                color: selected ? "#fff" : "#111111",
              }}
            >
              {pct}%
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => {
            setShowCustomTip(true);
            const n = parseAmount(customTipText);
            setTip({ mode: "custom", cents: n === null ? 0 : Math.round(n * 100) });
          }}
          className="rounded-full px-4 py-2.5 text-sm font-bold transition-all"
          style={{
            border: `1.6px solid ${tip.mode === "custom" ? "#FF6518" : "var(--color-input-border)"}`,
            background: tip.mode === "custom" ? "#FF6518" : "transparent",
            color: tip.mode === "custom" ? "#fff" : "#111111",
          }}
        >
          Otro
        </button>
      </div>
      {showCustomTip && (
        <input
          value={customTipText}
          onChange={(e) => {
            setCustomTipText(e.target.value);
            const n = parseAmount(e.target.value);
            setTip({ mode: "custom", cents: n === null ? 0 : Math.round(n * 100) });
          }}
          inputMode="decimal"
          placeholder="Monto de propina"
          className="mt-2 w-full rounded-2xl border-[1.6px] border-input-border bg-input px-4 py-3 text-[15px] font-bold tabular-nums outline-none focus:border-coral"
        />
      )}

      {/* Guardar como gasto */}
      <form action={addExpense} className="mt-6">
        <input type="hidden" name="amount" value={(totals.totalCents / 100).toFixed(2)} />
        <input type="hidden" name="merchant" value={merchant} />
        <input type="hidden" name="category_id" value={categoryId} />
        <input type="hidden" name="note" value="Cuenta dividida" />

        <div className="mb-2 text-[13px] font-bold text-muted-2">Guardar en la categoría</div>
        <div className="mb-3 flex flex-wrap gap-2">
          {categories.map((c, i) => {
            const selected = categoryId === c.id;
            const color = categoryColor(c.name, c.color);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryId(selected ? "" : c.id)}
                className="press inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-semibold text-ink transition-all"
                style={{
                  border: `1.6px solid ${selected ? "transparent" : "var(--color-input-border)"}`,
                  background: selected ? color : "transparent",
                  animation: `pop-in .3s ${(0.03 + i * 0.03).toFixed(2)}s both`,
                }}
              >
                <CategoryIcon name={c.name} emoji={c.icon} color="#111111" size={16} />
                {c.name}
              </button>
            );
          })}
        </div>

        <button
          type="submit"
          className="h-[58px] w-full rounded-[18px] bg-coral text-lg font-extrabold tracking-tight text-white"
        >
          Guardar como gasto
        </button>
      </form>

      <Link
        href="/"
        className="mt-3 flex h-[50px] w-full items-center justify-center rounded-[15px] bg-sand font-bold text-ink"
      >
        Listo, solo calcular
      </Link>
    </div>
  );
}
