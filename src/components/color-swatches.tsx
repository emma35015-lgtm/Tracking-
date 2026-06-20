"use client";

import { useState } from "react";
import { SWATCHES } from "@/lib/category-style";

// Selector de color: muestras tocables que escriben en un input oculto.
// Reutilizable en el form de categorías y en los de pagos fijos.
export function ColorSwatches({ name = "color", defaultValue }: { name?: string; defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue ?? SWATCHES[0]);
  return (
    <div>
      <input type="hidden" name={name} value={value} />
      <div className="flex flex-wrap gap-2">
        {SWATCHES.map((c) => {
          const selected = value.toLowerCase() === c.toLowerCase();
          return (
            <button
              key={c}
              type="button"
              aria-label={`Color ${c}`}
              onClick={() => setValue(c)}
              className="press h-8 w-8 rounded-full transition-transform"
              style={{
                background: c,
                outline: selected ? "2.5px solid var(--color-ink)" : "none",
                outlineOffset: 2,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
