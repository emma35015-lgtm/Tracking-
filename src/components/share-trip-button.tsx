"use client";

import { useState } from "react";

// Copia el link de solo lectura del bote para pasárselo a los amigos.
export function ShareTripButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}/v/${token}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Nuestro bote de viaje", url });
        return;
      }
    } catch {
      // si cancela el share nativo, caemos a copiar
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // último recurso: nada que hacer
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className="flex shrink-0 items-center gap-1.5 rounded-full bg-ink px-3 py-2 text-xs font-bold text-white"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7 M12 3v13 M7 8l5-5 5 5" />
      </svg>
      {copied ? "¡Copiado!" : "Compartir"}
    </button>
  );
}
