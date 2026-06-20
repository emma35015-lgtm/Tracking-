"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

// Pantalla de bienvenida de COCO. Se muestra una sola vez por sesión
// (igual que el prototipo de diseño: bandera en sessionStorage).
export function LaunchSplash() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let seen = true;
    try {
      seen = Boolean(sessionStorage.getItem("coco_seen"));
    } catch {
      seen = false;
    }
    if (seen) return;
    setShow(true);
    const t = setTimeout(() => {
      try {
        sessionStorage.setItem("coco_seen", "1");
      } catch {}
      setShow(false);
    }, 2100);
    return () => clearTimeout(t);
  }, []);

  if (!show) return null;

  const squares = ["#ece4d2", "#ffd84d", "#A7D9BF", "#9EC8E0", "#C9B8E8"];
  return (
    <div
      style={{ animation: "splash-out 2.1s ease forwards", background: "#e0532b" }}
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center"
    >
      {/* Barrita de colores estilo póster */}
      <div className="absolute left-7 top-16 flex gap-1.5" style={{ animation: "splash-word 1s ease both" }}>
        {squares.map((c) => (
          <span key={c} className="h-3.5 w-3.5 rounded-[3px]" style={{ background: c }} />
        ))}
      </div>

      <Image
        src="/brand/coco-logo.png"
        alt="COCO"
        width={188}
        height={188}
        priority
        style={{ width: 240, height: "auto", animation: "splash-logo 1s cubic-bezier(.2,.9,.3,1.2) both" }}
      />
      <div
        className="-mt-1 text-[56px] font-extrabold tracking-[-0.05em] text-[#ece4d2]"
        style={{ animation: "splash-word 1.1s ease both", lineHeight: 0.9 }}
      >
        COCO
      </div>
      <div
        className="mt-2.5 text-[11px] font-bold uppercase tracking-[0.24em] text-[#ece4d2]/80"
        style={{ animation: "splash-word 1.3s ease both" }}
      >
        gasta con cabeza
      </div>
    </div>
  );
}
