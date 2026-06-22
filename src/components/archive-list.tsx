"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Efecto "archivero": la ficha que queda al centro del viewport se asoma
// (crece y se levanta por encima de las vecinas) y regresa al alejarse.
// Continuo y ligado al scroll. Transforma cada hijo directo.
export function ArchiveList({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      const centerY = vh / 2;
      const range = vh * 0.42;
      const kids = Array.from(el.children) as HTMLElement[];
      kids.forEach((kid, idx) => {
        const r = kid.getBoundingClientRect();
        const c = r.top + r.height / 2;
        const lin = Math.max(0, 1 - Math.abs(c - centerY) / range);
        const t = lin * lin * (3 - 2 * lin); // smoothstep
        kid.style.transform = `scale(${(1 + 0.06 * t).toFixed(3)}) translateY(${(-9 * t).toFixed(1)}px)`;
        kid.style.zIndex = String(idx + 1 + Math.round(t * 1000));
        kid.style.transformOrigin = "center";
        kid.style.transition = "transform .12s ease-out";
        kid.style.willChange = "transform";
      });
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={ref} className={className} style={{ isolation: "isolate" }}>
      {children}
    </div>
  );
}
