"use client";

import { useState } from "react";
import { addExpense } from "@/app/(app)/actions";
import { categoryColor } from "@/lib/category-style";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"];

export function ExpenseForm({
  categories,
}: {
  categories: { id: string; name: string; icon: string }[];
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
      <input type="hidden" name="amount" value={amount} />
      <input type="hidden" name="category_id" value={categoryId} />

      {/* Monto */}
      <div className="mt-[22px]">
        <div className="text-[13px] font-semibold text-muted">Monto</div>
        <div className="mt-0.5 text-[64px] font-extrabold leading-none tracking-[-0.05em] tabular-nums">
          $<span>{amount === "" ? "0" : amount}</span>
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
        {categories.map((c) => {
          const selected = categoryId === c.id;
          const color = categoryColor(c.name);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoryId(selected ? "" : c.id)}
              className="rounded-full px-[15px] py-[9px] text-sm font-bold text-ink transition-all"
              style={{
                border: `1.5px solid ${selected ? "transparent" : "var(--color-input-border)"}`,
                background: selected ? color : "transparent",
              }}
            >
              {c.name}
            </button>
          );
        })}
      </div>

      {/* Teclado */}
      <div className="mt-5 grid grid-cols-3 gap-2">
        {KEYS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => press(k)}
            className="press h-[52px] rounded-[14px] border border-input-border bg-white text-2xl font-bold text-ink"
          >
            {k}
          </button>
        ))}
      </div>

      <button
        type="submit"
        disabled={saving || !(parseFloat(amount) > 0)}
        className="mt-4 h-[58px] rounded-[16px] bg-ink text-lg font-extrabold tracking-tight text-crema disabled:opacity-40"
      >
        {saving ? "Guardando…" : "Guardar gasto →"}
      </button>
    </form>
  );
}
