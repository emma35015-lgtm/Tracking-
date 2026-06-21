"use client";

// Reinicia el tutorial: borra la bandera y vuelve a Inicio (recarga completa).
export function ReplayTutorial() {
  return (
    <button
      type="button"
      onClick={() => {
        try {
          localStorage.removeItem("coco_onboarded");
        } catch {}
        window.location.assign("/");
      }}
      className="press flex w-full items-center justify-between rounded-[18px] border border-input-border bg-white px-[18px] py-4 text-left"
    >
      <div>
        <div className="text-[15px] font-bold tracking-tight">Ver el tutorial otra vez</div>
        <div className="text-xs font-medium text-muted">Te mostramos los primeros pasos de nuevo</div>
      </div>
      <span className="text-lg font-extrabold text-coral">→</span>
    </button>
  );
}
