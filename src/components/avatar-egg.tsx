"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

// Avatar con la inicial del usuario. Easter egg: 6 toques abren el panel
// del creador. La versión sirve para saber qué build está corriendo.
const VERSION = "2.5.1";
const BUILD = "COCO-251";

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
        className="press flex h-[40px] w-[40px] items-center justify-center rounded-full text-base font-extrabold text-white shadow-[0_4px_12px_-3px_rgba(242,100,30,0.6)]"
        style={{ background: "linear-gradient(135deg, #e0532b, #D995AF)" }}
      >
        {initial}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 px-8"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-xs rounded-[26px] bg-[#1c1a18] p-7 text-center text-[#efe7d2]"
            style={{ animation: "pop-in .4s cubic-bezier(.2,.9,.3,1.15) both" }}
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src="/brand/coco-logo.png"
              alt="COCO"
              width={72}
              height={72}
              className="mx-auto h-[72px] w-[72px] object-contain"
              style={{ animation: "floaty 6s ease-in-out infinite" }}
            />
            <div className="mt-2 text-2xl font-extrabold leading-none tracking-[-0.05em]">COCO</div>
            <div className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-[#efe7d2]/50">
              gasta con cabeza
            </div>

            <div className="mt-5 border-t border-white/10 pt-4">
              <div className="text-lg font-extrabold tracking-tight text-coral">Procesa Lab</div>
              <div className="mt-1 text-sm text-[#efe7d2]/65">
                <span className="font-semibold">Creador:</span> Emma Juárez
              </div>
            </div>

            <div className="mt-4 flex justify-center gap-2 text-xs font-bold">
              <span className="rounded-full bg-white/10 px-3 py-1.5 text-[#efe7d2]">Version {VERSION}</span>
              <span className="rounded-full bg-coral px-3 py-1.5 text-ink tabular-nums">Build {BUILD}</span>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="press mt-6 w-full rounded-[14px] bg-[#efe7d2] py-3 text-sm font-extrabold text-[#1c1a18]"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
