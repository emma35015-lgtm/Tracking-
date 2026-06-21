"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Shape =
  | ["path", string]
  | ["circle", number, number, number]
  | ["rect", number, number, number, number, number];

const NAV_ICONS: Record<string, Shape[]> = {
  home: [["path", "M4 11 12 4l8 7 M6 9.5V20h12V9.5"]],
  list: [
    ["rect", 5, 3, 14, 18, 2.5],
    ["path", "M9 8h6 M9 12h6 M9 16h4"],
  ],
  chart: [["path", "M5 19V9 M12 19V5 M19 19v-7"]],
  gear: [
    ["circle", 12, 12, 3],
    [
      "path",
      "M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.3 1a7 7 0 0 0-1.7-1l-.3-2.5h-4l-.3 2.5a7 7 0 0 0-1.7 1l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 1.7 1l.3 2.5h4l.3-2.5a7 7 0 0 0 1.7-1l2.3 1 2-3.4-2-1.5a7 7 0 0 0 .1-1Z",
    ],
  ],
};

function NavIcon({ name }: { name: string }) {
  return (
    <svg
      width={21}
      height={21}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {NAV_ICONS[name].map((s, i) => {
        if (s[0] === "path") return <path key={i} d={s[1]} />;
        if (s[0] === "circle") return <circle key={i} cx={s[1]} cy={s[2]} r={s[3]} />;
        return <rect key={i} x={s[1]} y={s[2]} width={s[3]} height={s[4]} rx={s[5]} />;
      })}
    </svg>
  );
}

const TABS = [
  { href: "/", icon: "home", label: "Inicio" },
  { href: "/gastos", icon: "list", label: "Gastos" },
  { href: "/analisis", icon: "chart", label: "Análisis" },
  { href: "/ajustes", icon: "gear", label: "Ajustes" },
];

export function TabBar() {
  const pathname = usePathname();

  return (
    <div
      className="fixed bottom-4 left-1/2 z-40 flex w-full max-w-lg -translate-x-1/2 items-center gap-2.5 px-[22px]"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <nav
        className="flex flex-1 items-center justify-around rounded-full px-4 py-2.5 ring-1 ring-white/15 backdrop-blur-xl backdrop-saturate-150"
        style={{
          background: "rgba(26,23,20,0.72)",
          boxShadow: "0 14px 34px -10px rgba(20,18,14,0.5), inset 0 1px 0 rgba(255,255,255,0.14)",
        }}
      >
        {TABS.map((tab) => {
          const active =
            tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-label={tab.label}
              className={`flex h-[42px] w-[42px] items-center justify-center rounded-full transition-colors ${
                active ? "bg-white/10 text-crema" : "text-[#ada493]/70"
              }`}
            >
              <NavIcon name={tab.icon} />
            </Link>
          );
        })}
      </nav>
      <Link
        href="/agregar"
        aria-label="Agregar gasto"
        className="press flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-full bg-coral shadow-[0_8px_20px_-6px_rgba(242,100,30,0.6)]"
        style={{ animation: "floaty 5s ease-in-out infinite" }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111111" strokeWidth="2.6" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </Link>
    </div>
  );
}
