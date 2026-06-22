"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Revela y agranda la sección/tarjeta al entrar al viewport (efecto "se asoma").
// La vibración queda preparada pero iOS web la ignora (Apple no la permite).
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Respeta "reducir movimiento".
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            try {
              (navigator as Navigator & { vibrate?: (n: number) => boolean }).vibrate?.(8);
            } catch {}
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.2, rootMargin: "0px 0px -6% 0px" }
    );
    io.observe(el);
    // Seguridad: si el observer no dispara, mostrar de todos modos.
    const t = setTimeout(() => setShown(true), 1400);
    return () => {
      io.disconnect();
      clearTimeout(t);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0.35,
        transform: shown ? "none" : "scale(0.95) translateY(12px)",
        transition: `opacity .55s ease ${delay}s, transform .6s cubic-bezier(.2,.8,.2,1) ${delay}s`,
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}
