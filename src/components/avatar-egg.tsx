"use client";

import { useEffect, useRef, useState } from "react";

// Avatar con la inicial del usuario. Easter egg: 6 toques abren el panel
// de Developer Info. La versión sirve para saber qué build está corriendo.
const VERSION = "1.1.1";
const BUILD = "EJ-111";

export function AvatarEgg({ initial }: { initial: string }) {
  const [taps, setTaps] = useState(0);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function handleTap() {
    if (timer.current) clearTimeout(timer.current);
    const next = taps + 1;
    if (next >= 6) {
      setOpen(true);
      setTaps(0);
      return;
    }
    setTaps(next);
    // Si dejas de tocar, se reinicia el conteo
    timer.current = setTimeout(() => setTaps(0), 1200);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleTap}
        aria-label="Perfil"
        className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-gradient-to-br from-[#E89B6C] to-[#D9694A] text-lg font-extrabold text-white"
      >
        {initial}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-8"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-xs rounded-[24px] bg-white p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-4xl">🥚</div>
            <div className="mt-3 flex items-center justify-center gap-1.5 text-sm font-extrabold tracking-tight">
              🔒 Developer Info
            </div>
            <div className="mt-4 flex flex-col gap-1 text-sm">
              <div className="text-lg font-extrabold tracking-tight text-coral">Procesa Lab</div>
              <div className="text-muted-2">
                <span className="font-semibold">Creator:</span> Emma Juárez
              </div>
            </div>
            <div className="mt-4 flex justify-center gap-2 text-xs font-bold">
              <span className="rounded-full bg-sand px-3 py-1 text-muted-2">Version {VERSION}</span>
              <span className="rounded-full bg-ink px-3 py-1 text-white tabular-nums">Build {BUILD}</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-5 w-full rounded-[14px] bg-sand py-2.5 text-sm font-bold text-ink"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
