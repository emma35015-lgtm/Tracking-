"use client";

import { useEffect, useState } from "react";

const KEY = "coco_onboarded";

type Slide = { bg: string; light: boolean; title: string; text: string };

const SLIDES: Slide[] = [
  {
    bg: "#e0532b",
    light: true,
    title: "Bienvenida a COCO",
    text: "Lleva tus gastos sin esfuerzo y con cabeza. Te tomará un minuto entenderla.",
  },
  {
    bg: "#A7D9BF",
    light: false,
    title: "Registra en segundos",
    text: "Toca el botón + para anotar un gasto. Eliges monto, comercio y categoría — y listo.",
  },
  {
    bg: "#9EC8E0",
    light: false,
    title: "Que se registre solo",
    text: "Conecta Apple Pay para que tus compras se anoten solas, y Siri para el efectivo: «Oye Siri, registrar gasto». Lo configuras en Ajustes.",
  },
  {
    bg: "#C9B8E8",
    light: false,
    title: "Tenla a la mano",
    text: "En Safari toca Compartir y elige «Añadir a pantalla de inicio» para abrir COCO como una app.",
  },
];

const COACH = [
  { align: "right" as const, text: "Toca el botón + para registrar un gasto en segundos." },
  { align: "left" as const, text: "Aquí cambias de sección: Inicio, Gastos, Análisis y Ajustes." },
];

export function Onboarding() {
  const [stage, setStage] = useState<"hidden" | "welcome" | "coach">("hidden");
  const [slide, setSlide] = useState(0);
  const [coach, setCoach] = useState(0);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    let done = true;
    try {
      done = Boolean(localStorage.getItem(KEY));
    } catch {
      done = false;
    }
    if (!done) setStage("welcome");
  }, []);

  function finish() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
    // Se desvanece pero NO se desmonta: evita la "franja" fantasma de iOS.
    setClosing(true);
  }

  if (stage === "hidden") return null;

  const fade = {
    opacity: closing ? 0 : 1,
    pointerEvents: (closing ? "none" : "auto") as "none" | "auto",
    transition: "opacity .45s ease",
    transform: "translateZ(0)",
  };

  if (stage === "welcome") {
    const s = SLIDES[slide];
    const ink = s.light ? "#ece4d2" : "#1a1714";
    const last = slide === SLIDES.length - 1;
    return (
      <div className="fixed inset-0 z-[210] flex flex-col px-7 pb-10 pt-24" style={{ background: s.bg, color: ink, ...fade }}>
        <button
          type="button"
          onClick={finish}
          className="absolute right-6 top-12 text-[13px] font-bold"
          style={{ color: ink, opacity: 0.6 }}
        >
          Saltar
        </button>

        <div key={slide} className="flex flex-1 flex-col justify-center" style={{ animation: "ed-in .4s ease both" }}>
          <div className="text-[40px] font-extrabold leading-[1.02] tracking-[-0.03em]">{s.title}</div>
          <p className="mt-4 max-w-[20rem] text-[17px] font-medium leading-relaxed" style={{ opacity: 0.85 }}>
            {s.text}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {SLIDES.map((_, i) => (
              <span
                key={i}
                className="h-2 rounded-full transition-all"
                style={{ width: i === slide ? 22 : 8, background: ink, opacity: i === slide ? 1 : 0.4 }}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => (last ? setStage("coach") : setSlide((v) => v + 1))}
            className="press rounded-full px-6 py-3 text-[15px] font-extrabold"
            style={{ background: ink, color: s.bg }}
          >
            {last ? "Empezar" : "Siguiente"}
          </button>
        </div>
      </div>
    );
  }

  // Coachmarks: globos anclados al dock (posición fija).
  const c = COACH[coach];
  const lastCoach = coach === COACH.length - 1;
  return (
    <div className="fixed inset-0 z-[210] bg-black/55" style={fade} onClick={() => (lastCoach ? finish() : setCoach((v) => v + 1))}>
      <div
        className="absolute"
        style={{ bottom: 104, left: c.align === "left" ? 18 : undefined, right: c.align === "right" ? 18 : undefined, maxWidth: 250 }}
      >
        <div className="rounded-[20px] bg-crema p-4 text-ink" style={{ animation: "pop-in .35s cubic-bezier(.2,.9,.3,1.15) both" }}>
          <p className="text-[15px] font-semibold leading-snug">{c.text}</p>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs font-bold text-muted">{coach + 1}/{COACH.length}</span>
            <span className="text-[13px] font-extrabold text-coral-link">{lastCoach ? "Listo" : "Siguiente →"}</span>
          </div>
        </div>
        <div
          className="h-3 w-3 rotate-45 bg-crema"
          style={{ marginTop: -6, ...(c.align === "left" ? { marginLeft: 28 } : { marginLeft: "auto", marginRight: 24 }) }}
        />
      </div>
    </div>
  );
}
