"use client";

import { useEffect, useState } from "react";

export function DarkModeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className="flex h-[44px] w-full items-center justify-between rounded-[16px] bg-input px-4"
    >
      <div className="flex items-center gap-3">
        {dark ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
        )}
        <span className="text-[15px] font-medium text-ink">
          {dark ? "Modo oscuro" : "Modo claro"}
        </span>
      </div>

      {/* Toggle pill */}
      <div
        className="relative h-7 w-12 rounded-full transition-colors duration-200"
        style={{ background: dark ? "#e07c55" : "#e2d8b6" }}
      >
        <div
          className="absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200"
          style={{ transform: dark ? "translateX(22px)" : "translateX(4px)" }}
        />
      </div>
    </button>
  );
}
