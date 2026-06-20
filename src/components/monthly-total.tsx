"use client";

import { useState } from "react";

// El total de "Gastos del mes": rebota al cargar y cada vez que lo tocas.
export function MonthlyTotal({ value }: { value: string }) {
  const [tick, setTick] = useState(0);
  return (
    <div
      key={tick}
      onPointerDown={() => setTick((t) => t + 1)}
      className="select-none text-[96px] font-light leading-[0.92] tracking-[-0.04em] tabular-nums"
      style={{
        animation: "amount-pop .55s cubic-bezier(.2,.9,.3,1.3) both",
        transformOrigin: "left center",
        touchAction: "manipulation",
        cursor: "pointer",
      }}
    >
      {value}
    </div>
  );
}
