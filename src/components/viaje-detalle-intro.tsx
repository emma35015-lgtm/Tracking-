"use client";

import { useEffect, useState } from "react";

const KEY = "coco_viaje_detalle_seen";

const STEPS = [
  {
    bg: "#e0532b",
    light: true,
    title: "Este es tu viaje",
    text: "Aquí arriba ves el saldo del bote: cuánto se juntó, cuánto se ha gastado y cuánto queda.",
  },
  {
    bg: "#A7D9BF",
    light: false,
    title: "1. Gastos del bote",
    text: "Anota lo que se va gastando del bote (cena, gasolina, hotel…). Cada gasto baja el saldo.",
  },
  {
    bg: "#9EC8E0",
    light: false,
    title: "2. Aportaciones",
    text: "Registra lo que cada quien pone al bote. Eso es lo que sube el saldo disponible.",
  },
  {
    bg: "#C9B8E8",
    light: false,
    title: "3. Personas",
    text: "Agrega a quién va en el viaje. Con eso COCO reparte el gasto en partes iguales.",
  },
  {
    bg: "#D995AF",
    light: false,
    title: "4. Invita y listo",
    text: "Usa el botón de compartir (arriba) para mandar el link. Quien tenga COCO se une y anota lo suyo; al final ves a quién le toca poner o recibir.",
  },
];

export function ViajeDetalleIntro() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
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

  const s = STEPS[step];
  const ink = s.light ? "#ece4d2" : "#1a1714";
  const last = step === STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-[180]"
      style={{ background: "var(--color-crema)", opacity: closing ? 0 : 1, transition: "opacity .35s ease" }}
    >
      <div
        className="absolute inset-x-0 bottom-0 flex flex-col px-7 pb-10 pt-16"
        style={{ top: "env(safe-area-inset-top)", background: s.bg, color: ink }}
      >
        <button type="button" onClick={finish} className="absolute right-6 top-6 text-[13px] font-bold" style={{ color: ink, opacity: 0.6 }}>
          Saltar
        </button>

        <div key={step} className="flex flex-1 flex-col justify-center" style={{ animation: "ed-in .4s ease both" }}>
          <div className="text-[34px] font-extrabold leading-[1.05] tracking-[-0.03em]">{s.title}</div>
          <p className="mt-4 max-w-[20rem] text-[17px] font-medium leading-relaxed" style={{ opacity: 0.82 }}>
            {s.text}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className="h-2 rounded-full transition-all"
                style={{ width: i === step ? 22 : 8, background: ink, opacity: i === step ? 1 : 0.35 }}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => (last ? finish() : setStep((v) => v + 1))}
            className="press rounded-full px-6 py-3 text-[15px] font-extrabold"
            style={{ background: ink, color: s.bg }}
          >
            {last ? "Entendido" : "Siguiente"}
          </button>
        </div>
      </div>
    </div>
  );
}
