"use client";

import { useState } from "react";
import { addExpense } from "@/app/(app)/actions";
import { categoryColor } from "@/lib/category-style";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"];
const CONFETTI = ["#FF6518", "#F4CF12", "#A7D9BF", "#9EC8E0", "#C9B8E8", "#D995AF"];

function Celebration() {
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-crema/70 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 18 }).map((_, i) => (
          <span
            key={i}
            className="absolute top-0 h-2.5 w-2.5 rounded-[2px]"
            style={{
              left: `${(i * 5.5 + 6) % 100}%`,
              background: CONFETTI[i % CONFETTI.length],
              animation: `confetti-fall ${0.9 + (i % 5) * 0.15}s ${(i % 7) * 0.05}s ease-in forwards`,
            }}
          />
        ))}
      </div>
      <div
        className="flex h-20 w-20 items-center justify-center rounded-full bg-coral"
        style={{ animation: "success-pop .45s cubic-bezier(.2,.9,.3,1.2) both" }}
      >
        <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#111111" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </div>
    </div>
  );
}

export function ExpenseForm({
  categories,
}: {
  categories: { id: string; name: string; icon: string; color?: string | null }[];
}) {
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [saving, setSaving] = useState(false);

  function press(k: string) {
    setAmount((a) => {
      if (k === "⌫") return a.slice(0, -1);
      if (k === ".") return a.includes(".") ? a : (a === "" ? "0" : a) + ".";
      if (a.replace(".", "").length >= 7) return a;
      const decimals = a.split(".")[1];
      if (decimals !== undefined && decimals.length >= 2) return a;
      return a === "0" ? k : a + k;
    });
  }

  return (
    <form action={addExpense} onSubmit={() => setSaving(true)} className="flex flex-col">
      {saving && <Celebration />}
      <input type="hidden" name="amount" value={amount} />
      <input type="hidden" name="category_id" value={categoryId} />

      {/* Monto */}
      <div className="count-up mt-[22px]">
        <div className="text-[13px] font-semibold text-muted">Monto</div>
        <div className="mt-0.5 text-[64px] font-extrabold leading-none tracking-[-0.05em] tabular-nums">
          $<span key={amount} style={{ display: "inline-block", animation: "pop-in .2s ease" }}>{amount === "" ? "0" : amount}</span>
        </div>
      </div>

      {/* Comercio */}
      <div className="mt-[18px]">
        <input
          name="merchant"
          placeholder="Comercio (OXXO, tacos…)"
          className="w-full border-0 border-b-[1.6px] border-input-border bg-transparent py-3 text-[17px] font-semibold text-ink outline-none placeholder:text-muted focus:border-coral"
        />
      </div>

      {/* Categoría */}
      <div className="mt-[18px] flex flex-wrap gap-2">
        {categories.map((c, i) => {
          const selected = categoryId === c.id;
          const color = categoryColor(c.name, c.color);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoryId(selected ? "" : c.id)}
              className="press rounded-full px-[15px] py-[9px] text-sm font-bold text-ink transition-all"
              style={{
                border: `1.5px solid ${selected ? "transparent" : "var(--color-input-border)"}`,
                background: selected ? color : "transparent",
                animation: `pop-in .3s ${(0.04 + i * 0.03).toFixed(2)}s both`,
              }}
            >
              {c.name}
            </button>
          );
        })}
      </div>

      {/* Teclado */}
      <div className="mt-5 grid grid-cols-3 gap-2">
        {KEYS.map((k, i) => (
          <button
            key={k}
            type="button"
            onClick={() => press(k)}
            className="press h-[52px] rounded-[14px] border border-input-border bg-white text-2xl font-bold text-ink"
            style={{ animation: `pop-in .3s ${(0.02 + i * 0.025).toFixed(3)}s both` }}
          >
            {k}
          </button>
        ))}
      </div>

      <button
        type="submit"
        disabled={saving || !(parseFloat(amount) > 0)}
        className="press mt-4 h-[58px] rounded-[16px] bg-ink text-lg font-extrabold tracking-tight text-crema disabled:opacity-40"
        style={{ animation: "count-up .5s .35s both" }}
      >
        {saving ? "Guardando…" : "Guardar gasto →"}
      </button>
    </form>
  );
}
