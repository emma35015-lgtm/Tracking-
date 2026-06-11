import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { addExpense } from "@/app/(app)/actions";
import { CategoryChips } from "@/components/category-chips";

export default async function AgregarPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, icon")
    .order("name");

  return (
    <div>
      <h1 className="mb-4 text-lg font-bold">Agregar gasto</h1>

      <form action={addExpense} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Monto
          <input
            name="amount"
            inputMode="decimal"
            required
            autoFocus
            placeholder="0.00"
            className="rounded-xl border border-zinc-300 bg-white px-4 py-4 text-center text-4xl font-bold tabular-nums outline-none focus:border-brand"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Comercio
          <input
            name="merchant"
            placeholder="Opcional: OXXO, tacos de la esquina…"
            className="rounded-xl border border-zinc-300 bg-white px-4 py-3 outline-none focus:border-brand"
          />
        </label>

        <div className="flex flex-col gap-1 text-sm font-medium">
          Categoría
          <CategoryChips categories={categories ?? []} />
        </div>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Nota
          <input
            name="note"
            placeholder="Opcional"
            className="rounded-xl border border-zinc-300 bg-white px-4 py-3 outline-none focus:border-brand"
          />
        </label>

        <button
          type="submit"
          className="rounded-xl bg-brand px-4 py-3 font-semibold text-white"
        >
          Guardar gasto
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-zinc-400">
        Tip: para no teclear nada,{" "}
        <Link href="/ajustes/atajos" className="text-brand underline">
          configura los Atajos de tu iPhone
        </Link>
        .
      </p>
    </div>
  );
}
