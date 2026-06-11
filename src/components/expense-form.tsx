"use client";

import { useState } from "react";
import { addExpense } from "@/app/(app)/actions";
import { CategoryIcon, categoryColor } from "@/lib/category-style";

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
      <div className="mt-[18px] rounded-[26px] bg-white px-5 py-[26px] text-center">
        <div className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Monto</div>
        <div className="mt-2 text-[60px] font-extrabold leading-none tracking-[-0.04em] tabular-nums">
          $<span>{amount === "" ? "0" : amount}</span>
        </div>
      </div>

      {/* Comercio */}
      <div className="mt-4">
        <div className="mb-2 text-[13px] font-bold text-muted-2">Comercio</div>
        <input
          name="merchant"
          placeholder="Opcional: OXXO, tacos de la esquina…"
          className="w-full rounded-2xl border-[1.6px] border-input-border bg-input px-4 py-3.5 text-[15px] font-medium text-ink outline-none focus:border-coral"
        />
      </div>

      {/* Categoría */}
      <div className="mt-[18px]">
        <div className="mb-2.5 text-[13px] font-bold text-muted-2">Categoría</div>
        <div className="flex flex-wrap gap-[9px]">
          {categories.map((c) => {
            const selected = categoryId === c.id;
            const pastel = categoryColor(c.name);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryId(selected ? "" : c.id)}
                className="inline-flex items-center gap-[7px] rounded-full px-3.5 py-[9px] text-sm font-semibold text-ink transition-all"
                style={{
                  border: `1.6px solid ${selected ? pastel : "#E2D8B6"}`,
                  background: selected ? pastel : "#FBF6E6",
                }}
              >
                <CategoryIcon name={c.name} emoji={c.icon} color="#15140F" size={18} />
                <span>{c.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Teclado */}
      <div className="mt-5 grid grid-cols-3 gap-2">
        {KEYS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => press(k)}
            className="h-[52px] rounded-2xl bg-white text-2xl font-bold text-ink active:bg-sand"
          >
            {k}
          </button>
        ))}
      </div>

      <button
        type="submit"
        disabled={saving || !(parseFloat(amount) > 0)}
        className="mt-4 h-[58px] rounded-[18px] bg-coral text-lg font-extrabold tracking-tight text-white disabled:opacity-40"
      >
        {saving ? "Guardando…" : "Guardar gasto"}
      </button>
    </form>
  );
}
