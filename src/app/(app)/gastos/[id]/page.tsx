import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteExpense, updateExpense } from "@/app/(app)/actions";

export default async function EditarGastoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: expense }, { data: categories }] = await Promise.all([
    supabase
      .from("expenses")
      .select("id, amount, merchant, category_id, occurred_at, note")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("categories").select("id, name, icon").order("name"),
  ]);

  if (!expense) notFound();

  // datetime-local espera "YYYY-MM-DDTHH:mm"
  const occurredLocal = new Date(expense.occurred_at).toISOString().slice(0, 16);

  return (
    <div>
      <h1 className="mb-4 text-lg font-bold">Editar gasto</h1>

      <form action={updateExpense} className="flex flex-col gap-4">
        <input type="hidden" name="id" value={expense.id} />

        <label className="flex flex-col gap-1 text-sm font-medium">
          Monto
          <input
            name="amount"
            inputMode="decimal"
            required
            defaultValue={String(expense.amount)}
            className="rounded-xl border border-zinc-300 bg-white px-4 py-3 text-2xl font-semibold tabular-nums outline-none focus:border-brand"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Comercio
          <input
            name="merchant"
            defaultValue={expense.merchant ?? ""}
            placeholder="OXXO, Uber…"
            className="rounded-xl border border-zinc-300 bg-white px-4 py-3 outline-none focus:border-brand"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Categoría
          <select
            name="category_id"
            defaultValue={expense.category_id ?? ""}
            className="rounded-xl border border-zinc-300 bg-white px-4 py-3 outline-none focus:border-brand"
          >
            <option value="">Sin categoría</option>
            {(categories ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
          <span className="text-xs font-normal text-zinc-400">
            Al cambiarla, los próximos gastos de este comercio usarán esta categoría.
          </span>
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Fecha y hora
          <input
            name="occurred_at"
            type="datetime-local"
            defaultValue={occurredLocal}
            className="rounded-xl border border-zinc-300 bg-white px-4 py-3 outline-none focus:border-brand"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Nota
          <input
            name="note"
            defaultValue={expense.note ?? ""}
            placeholder="Opcional"
            className="rounded-xl border border-zinc-300 bg-white px-4 py-3 outline-none focus:border-brand"
          />
        </label>

        <button
          type="submit"
          className="rounded-xl bg-brand px-4 py-3 font-semibold text-white"
        >
          Guardar
        </button>
      </form>

      <form action={deleteExpense} className="mt-3">
        <input type="hidden" name="id" value={expense.id} />
        <button
          type="submit"
          className="w-full rounded-xl border border-red-200 px-4 py-3 font-semibold text-red-600"
        >
          Eliminar gasto
        </button>
      </form>
    </div>
  );
}
