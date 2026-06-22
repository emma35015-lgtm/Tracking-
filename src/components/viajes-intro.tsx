"use client";

import { useEffect, useState } from "react";

const KEY = "coco_viajes_seen";

const SLIDES = [
  {
    bg: "#9EC8E0",
    title: "El bote compartido",
    text: "Un viaje es un bote entre amigos: cada quien anota lo que pone (aportaciones) y lo que se gasta del bote.",
  },
  {
    bg: "#A7D9BF",
    title: "Invita con un link",
    text: "Comparte el link del viaje. Quien ya tenga COCO se une y puede anotar sus propios gastos; cada quien edita lo suyo.",
  },
  {
    bg: "#C9B8E8",
    title: "COCO saca las cuentas",
    text: "La app calcula cuánto se juntó, cuánto se gastó y a quién le toca poner o le toca recibir. Sin pleitos.",
  },
];

export function ViajesIntro() {
  const [show, setShow] = useState(false);
  const [slide, setSlide] = useState(0);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    let seen = true;
    try {
      seen = Boolean(localStorage.getItem(KEY));
    } catch {
      seen = false;
    }
    if (!seen) setShow(true);
  }, []);

  if (!show) return null;

  function finish() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
    setClosing(true);
    setTimeout(() => setShow(false), 350);
  }

  const s = SLIDES[slide];
  const last = slide === SLIDES.length - 1;

  return (
    <div
      className="fixed inset-0 z-[180]"
      style={{ background: "var(--color-crema)", opacity: closing ? 0 : 1, transition: "opacity .35s ease" }}
    >
      <div
        className="absolute inset-x-0 bottom-0 flex flex-col px-7 pb-10 pt-16 text-ink"
        style={{ top: "env(safe-area-inset-top)", background: s.bg }}
      >
        <button type="button" onClick={finish} className="absolute right-6 top-6 text-[13px] font-bold text-black/55">
          Saltar
        </button>

        <div key={slide} className="flex flex-1 flex-col justify-center" style={{ animation: "ed-in .4s ease both" }}>
          <div className="text-[36px] font-extrabold leading-[1.05] tracking-[-0.03em]">{s.title}</div>
          <p className="mt-4 max-w-[20rem] text-[17px] font-medium leading-relaxed text-black/75">{s.text}</p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {SLIDES.map((_, i) => (
              <span
                key={i}
                className="h-2 rounded-full bg-black transition-all"
                style={{ width: i === slide ? 22 : 8, opacity: i === slide ? 1 : 0.35 }}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => (last ? finish() : setSlide((v) => v + 1))}
            className="press rounded-full bg-ink px-6 py-3 text-[15px] font-extrabold text-crema"
          >
            {last ? "Entendido" : "Siguiente"}
          </button>
        </div>
      </div>
    </div>
  );
}
