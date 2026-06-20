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

  return (
    <div
      style={{ animation: "splash-out 2.1s ease forwards" }}
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-crema"
    >
      <Image
        src="/brand/coco-logo.png"
        alt="COCO"
        width={188}
        height={188}
        priority
        style={{ width: 168, height: "auto", animation: "splash-logo 1s cubic-bezier(.2,.9,.3,1.2) both" }}
      />
      <div
        className="-mt-1.5 text-[46px] font-extrabold tracking-[-0.05em] text-ink"
        style={{ animation: "splash-word 1.1s ease both", lineHeight: 0.9 }}
      >
        COCO
      </div>
      <div
        className="mt-2 text-[11px] font-bold uppercase tracking-[0.22em] text-muted"
        style={{ animation: "splash-word 1.3s ease both" }}
      >
        gasta con cabeza
      </div>
    </div>
  );
}
