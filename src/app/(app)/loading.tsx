// Skeleton instantáneo mientras carga la pantalla: hace que cambiar de
// pestaña se sienta inmediato aunque los datos sigan en camino.
export default function Loading() {
  return (
    <div className="screen-in">
      <div className="mt-2 h-12 w-2/3 animate-pulse rounded-2xl bg-sand" />
      <div className="mt-5 h-40 animate-pulse rounded-[28px] bg-sand" />
      <div className="mt-4 h-32 animate-pulse rounded-[26px] bg-sand" />
      <div className="mt-4 flex flex-col gap-3">
        <div className="h-[72px] animate-pulse rounded-[22px] bg-white/70" />
        <div className="h-[72px] animate-pulse rounded-[22px] bg-white/70" />
        <div className="h-[72px] animate-pulse rounded-[22px] bg-white/70" />
      </div>
    </div>
  );
}
