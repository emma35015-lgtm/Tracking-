"use client";

import { useState } from "react";

export type Insight = {
  eyebrow: string;
  value: string;
  detail: string;
  more: string;
  color: string;
};

// Lista compacta de consejos: cada fila se expande con la flecha para
// mostrar el detalle especializado, sin ocupar tanto espacio.
export function InsightList({ insights }: { insights: Insight[] }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="overflow-hidden rounded-[20px] border border-input-border">
      {insights.map((it, i) => {
        const expanded = open === i;
        return (
          <div key={i} className={i > 0 ? "border-t border-input-border" : ""}>
            <button
              type="button"
              onClick={() => setOpen(expanded ? null : i)}
              className="press flex w-full items-center gap-3 px-4 py-3.5 text-left"
            >
              <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: it.color }} />
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
                  {it.eyebrow}
                </span>
                <span className="block truncate text-[17px] font-extrabold tracking-[-0.02em] tabular-nums">
                  {it.value}
                </span>
              </span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="flex-none text-muted transition-transform"
                style={{ transform: expanded ? "rotate(90deg)" : "none" }}
              >
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
            {expanded && (
              <div className="px-4 pb-4" style={{ animation: "ed-in .3s ease both" }}>
                <p className="text-[13px] font-semibold leading-snug text-muted-2">{it.detail}</p>
                <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-muted">{it.more}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
