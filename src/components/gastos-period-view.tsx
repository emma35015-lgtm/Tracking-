"use client";

import { useState } from "react";
import Link from "next/link";
import { formatMoneyShort } from "@/lib/format";

export type GastoItem = {
  id: string;
  title: string;
  category: string;
  amount: number;
  currency: string;
  dayLabel: string;
  ago: number; // días desde hoy
  thisMonth: boolean;
  thisYear: boolean;
  mono: string;
  color: string;
};

const PERIODS = ["Hoy", "Ayer", "Semana", "Mes", "Año", "Todo"] as const;
type Period = (typeof PERIODS)[number];

function matches(it: GastoItem, p: Period): boolean {
  if (p === "Hoy") return it.ago === 0;
  if (p === "Ayer") return it.ago === 1;
  if (p === "Semana") return it.ago <= 7;
  if (p === "Mes") return it.thisMonth;
  if (p === "Año") return it.thisYear;
  return true;
}

export function GastosPeriodView({ items }: { items: GastoItem[] }) {
  const [period, setPeriod] = useState<Period>("Hoy");
  const currency = items[0]?.currency ?? "MXN";

  const filtered = items.filter((it) => matches(it, period));
  const total = filtered.reduce((s, it) => s + it.amount, 0);

  return (
    <div className="screen-in px-1 pt-2">
      <div className="flex items-center justify-between">
        <div className="text-[22px] font-extrabold tracking-[-0.02em]">Agrupar</div>
        <svg width="20" height="12" viewBox="0 0 20 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3 10 9 18 3" />
        </svg>
      </div>

      {/* Selector de periodo: números grandes */}
      <div className="mt-2.5">
        {PERIODS.map((p) => {
          const active = period === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className="block w-full border-b border-crema py-2.5 text-left"
            >
              <span
                className="text-[42px] font-extrabold tracking-[-0.035em] transition-colors"
                style={{ color: active ? "#FF6518" : "var(--color-muted-3)" }}
              >
                {p}
              </span>
            </button>
          );
        })}
      </div>

      {/* Resumen + lista filtrada */}
      <div className="mt-[22px] flex items-baseline justify-between">
        <span className="text-[13px] font-bold uppercase tracking-[0.05em] text-muted">
          {filtered.length} {filtered.length === 1 ? "gasto" : "gastos"}
        </span>
        <span className="text-lg font-extrabold tracking-[-0.02em] tabular-nums">
          -{formatMoneyShort(total, currency)}
        </span>
      </div>

      <div className="mt-3 flex flex-col">
        {filtered.length === 0 ? (
          <div className="rounded-[18px] bg-white p-6 text-center text-sm font-medium text-muted">
            Sin gastos en este periodo.
          </div>
        ) : (
          filtered.map((it) => (
            <Link
              key={it.id}
              href={`/gastos/${it.id}`}
              className="flex items-center gap-3 border-b border-crema py-3"
            >
              <div
                className="flex h-10 w-10 flex-none items-center justify-center rounded-full text-[15px] font-extrabold text-[#111]"
                style={{ background: it.color }}
              >
                {it.mono}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-bold tracking-[-0.01em]">{it.title}</div>
                <div className="text-xs font-medium text-muted">
                  {it.dayLabel} · {it.category}
                </div>
              </div>
              <div className="text-[17px] font-extrabold tracking-[-0.02em] tabular-nums">
                -{formatMoneyShort(it.amount, it.currency)}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
