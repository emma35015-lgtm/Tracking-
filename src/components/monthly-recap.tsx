"use client";

import { useEffect, useState } from "react";

// Tarjeta "wrapped" del mes anterior. Se puede descartar y no vuelve a salir
// para ese mes (bandera en localStorage).
export function MonthlyRecap({
  monthName,
  total,
  topCategory,
  topColor,
  count,
}: {
  monthName: string;
  total: string;
  topCategory: string;
  topColor: string;
  count: number;
}) {
  const key = `coco_recap_${monthName}`;
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      setShow(!localStorage.getItem(key));
    } catch {
      setShow(true);
    }
  }, [key]);

  if (!show) return null;

  function dismiss() {
    try {
      localStorage.setItem(key, "1");
    } catch {}
    setShow(false);
  }

  return (
    <div
      className="pop-in mt-[22px] overflow-hidden rounded-[24px] bg-ink p-5 text-crema"
      style={{ borderLeft: `6px solid ${topColor}` }}
    >
      <div className="flex items-start justify-between">
        <div className="text-xs font-bold uppercase tracking-[0.14em] text-crema/60">
          Tu {monthName} en resumen
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Cerrar"
          className="press -mr-1 -mt-1 px-1 text-lg text-crema/60"
        >
          ×
        </button>
      </div>
      <div className="font-display mt-2 text-[44px] font-black leading-none tracking-[-0.03em] tabular-nums">
        {total}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] font-semibold">
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full" style={{ background: topColor }} />
          Categoría top: {topCategory}
        </span>
        <span className="text-crema/55">
          {count} {count === 1 ? "gasto" : "gastos"}
        </span>
      </div>
    </div>
  );
}
