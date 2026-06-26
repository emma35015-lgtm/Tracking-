import type { ReactNode } from "react";

// Tarjeta grande de color para cada sección del viaje (Gastos del bote,
// Aportaciones, Personas, Cuentas finales). Texto oscuro sobre pastel.
export function SectionCard({
  color,
  title,
  subtitle,
  children,
}: {
  color: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] p-6 text-[#1a1714]" style={{ background: color }}>
      <h2 className="text-[25px] font-extrabold leading-none tracking-[-0.02em]">{title}</h2>
      {subtitle && <p className="mt-1 text-xs font-semibold text-black/45">{subtitle}</p>}
      <div className="mt-3.5">{children}</div>
    </section>
  );
}
