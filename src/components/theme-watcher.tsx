"use client";

import { useEffect } from "react";
import { applyThemeMode, readThemeMode } from "@/lib/theme";

// Mantiene el modo "automático" al día: revisa cada minuto si ya cruzó
// el atardecer / amanecer y cambia el tema sin recargar.
export function ThemeWatcher() {
  useEffect(() => {
    const tick = () => {
      if (readThemeMode() === "auto") applyThemeMode("auto");
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);
  return null;
}
