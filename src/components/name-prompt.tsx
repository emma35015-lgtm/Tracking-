"use client";

import { useState } from "react";
import { setDisplayName } from "@/app/(app)/actions";

// Aviso "¿Cómo te llamas?" cuando el perfil no tiene nombre.
export function NamePrompt({ missing }: { missing: boolean }) {
  const [dismissed, setDismissed] = useState(false);
  if (!missing || dismissed) return null;

  return (
    <div className="fixed inset-0 z-[190] flex items-end justify-center bg-black/45 px-4 pb-10 pt-24">
      <form
        action={setDisplayName}
        onSubmit={() => setDismissed(true)}
        className="w-full max-w-sm rounded-[26px] bg-crema p-6"
        style={{ animation: "pop-in .4s cubic-bezier(.2,.9,.3,1.15) both" }}
      >
        <div className="text-[22px] font-extrabold tracking-tight">¿Cómo te llamas?</div>
        <p className="mt-1.5 text-sm font-medium text-muted-2">
          Para personalizar tu COCO. Lo puedes cambiar después en Ajustes.
        </p>
        <input
          name="display_name"
          required
          autoFocus
          maxLength={40}
          placeholder="Tu nombre"
          className="mt-4 w-full rounded-[14px] border-[1.6px] border-input-border bg-input px-[15px] py-[13px] text-[15px] font-medium text-ink outline-none focus:border-coral"
        />
        <button
          type="submit"
          className="press mt-4 h-[50px] w-full rounded-[15px] bg-ink text-base font-extrabold text-crema"
        >
          Guardar
        </button>
      </form>
    </div>
  );
}
