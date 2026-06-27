"use client";

import { useEffect, useState } from "react";
import { applyThemeMode, readThemeMode, sunsetLabel, type ThemeMode } from "@/lib/theme";

type Opt = { mode: ThemeMode; label: string; icon: React.ReactNode };

const OPTIONS: Opt[] = [
  {
    mode: "light",
    label: "Claro",
    icon: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </>
    ),
  },
  {
    mode: "auto",
    label: "Auto",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3a9 9 0 0 0 0 18Z" fill="currentColor" stroke="none" />
      </>
    ),
  },
  {
    mode: "dark",
    label: "Oscuro",
    icon: <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />,
  },
];

export function ThemeControl() {
  const [mode, setMode] = useState<ThemeMode>("light");
  const [sunset, setSunset] = useState("");

  useEffect(() => {
    setMode(readThemeMode());
    setSunset(sunsetLabel());
  }, []);

  function choose(m: ThemeMode) {
    setMode(m);
    applyThemeMode(m);
  }

  return (
    <div>
      <div className="flex gap-1.5 rounded-[16px] bg-input p-1.5">
        {OPTIONS.map((o) => {
          const active = mode === o.mode;
          return (
            <button
              key={o.mode}
              type="button"
              onClick={() => choose(o.mode)}
              aria-pressed={active}
              className={`flex flex-1 flex-col items-center gap-1.5 rounded-[12px] py-2.5 text-[12px] font-bold transition-colors ${
                active ? "bg-ink text-crema" : "text-muted-2"
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                {o.icon}
              </svg>
              {o.label}
            </button>
          );
        })}
      </div>
      {mode === "auto" && (
        <p className="mx-1 mt-2 text-xs font-medium text-muted">
          Cambia solo: oscuro después del atardecer (~{sunset}) y claro por la mañana.
        </p>
      )}
    </div>
  );
}
