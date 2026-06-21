"use client";

import { useState } from "react";

// Botón "i" que abre una explicación corta y simple. Reutilizable.
export function InfoButton({ title, text }: { title: string; text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label={`Qué es: ${title}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className="press inline-flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full border border-input-border text-[11px] font-bold leading-none text-muted"
      >
        i
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[160] flex items-end justify-center bg-black/40 px-4 pb-8 pt-20"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-[26px] bg-crema p-6"
            style={{ animation: "pop-in .35s cubic-bezier(.2,.9,.3,1.15) both" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[19px] font-extrabold tracking-tight">{title}</div>
            <p className="mt-2 text-[15px] font-medium leading-relaxed text-muted-2">{text}</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="press mt-5 h-[48px] w-full rounded-[14px] bg-ink text-sm font-extrabold text-crema"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
