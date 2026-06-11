"use client";

import { useState } from "react";

export function CategoryChips({
  categories,
}: {
  categories: { id: string; name: string; icon: string }[];
}) {
  const [selected, setSelected] = useState<string>("");

  return (
    <div className="flex flex-wrap gap-2">
      <input type="hidden" name="category_id" value={selected} />
      {categories.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => setSelected(selected === c.id ? "" : c.id)}
          className={`rounded-full border px-3 py-1.5 text-sm ${
            selected === c.id
              ? "border-brand bg-brand text-white"
              : "border-zinc-300 bg-white text-zinc-700"
          }`}
        >
          {c.icon} {c.name}
        </button>
      ))}
    </div>
  );
}
