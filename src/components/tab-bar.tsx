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
  plus: [["path", "M12 5v14 M5 12h14"]],
  chart: [["path", "M4 16 9 11l4 4 7-8"]],
  gear: [
    ["circle", 12, 12, 3],
    [
      "path",
      "M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.3 1a7 7 0 0 0-1.7-1l-.3-2.5h-4l-.3 2.5a7 7 0 0 0-1.7 1l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 1.7 1l.3 2.5h4l.3-2.5a7 7 0 0 0 1.7-1l2.3 1 2-3.4-2-1.5a7 7 0 0 0 .1-1Z",
    ],
  ],
};

function NavIcon({ name, size }: { name: string; size: number }) {
  return (
    <svg
      width={size}
      height={size}
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
  { href: "/agregar", icon: "plus", label: "Agregar" },
  { href: "/analisis", icon: "chart", label: "Análisis" },
  { href: "/ajustes", icon: "gear", label: "Ajustes" },
];

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-[18px] left-1/2 z-40 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-ink px-3 py-2 shadow-[0_16px_36px_-10px_rgba(0,0,0,0.45)]"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      {TABS.map((tab) => {
        const active =
          tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
        const isAdd = tab.icon === "plus";
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-label={tab.label}
            className={`flex h-[46px] w-[46px] items-center justify-center rounded-full transition-colors ${
              isAdd
                ? "bg-coral text-white"
                : active
                ? "bg-crema text-ink dark:bg-white/10 dark:text-[#ede7c9]"
                : "bg-transparent text-[#9A9384] dark:text-[#7a7060]"
            }`}
          >
            <NavIcon name={tab.icon} size={isAdd ? 23 : 21} />
          </Link>
        );
      })}
    </nav>
  );
}
