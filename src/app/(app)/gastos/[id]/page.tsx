import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteExpense, updateExpense } from "@/app/(app)/actions";

const inputClass =
  "w-full rounded-2xl border-[1.6px] border-input-border bg-input px-4 py-3.5 text-[15px] font-medium text-ink outline-none focus:border-coral";

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
    <div className="screen-in">
      <h1 className="mt-1.5 text-[26px] font-extrabold tracking-tight">Editar gasto</h1>

      <form action={updateExpense} className="mt-4 flex flex-col gap-4">
        <input type="hidden" name="id" value={expense.id} />

        <div className="rounded-[26px] bg-white px-5 py-6 text-center">
          <div className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Monto</div>
          <input
            name="amount"
            inputMode="decimal"
            required
            defaultValue={String(expense.amount)}
            className="mt-2 w-full bg-transparent text-center text-5xl font-extrabold tracking-[-0.04em] tabular-nums outline-none"
          />
        </div>

        <label className="flex flex-col gap-2 text-[13px] font-bold text-muted-2">
          Comercio
          <input name="merchant" defaultValue={expense.merchant ?? ""} placeholder="OXXO, Uber…" className={inputClass} />
        </label>

        <label className="flex flex-col gap-2 text-[13px] font-bold text-muted-2">
          Categoría
          <select name="category_id" defaultValue={expense.category_id ?? ""} className={inputClass}>
            <option value="">Sin categoría</option>
            {(categories ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
          <span className="text-xs font-medium text-muted">
            Al cambiarla, los próximos gastos de este comercio usarán esta categoría.
          </span>
        </label>

        <label className="flex flex-col gap-2 text-[13px] font-bold text-muted-2">
          Fecha y hora
          <input name="occurred_at" type="datetime-local" defaultValue={occurredLocal} className={inputClass} />
        </label>

        <label className="flex flex-col gap-2 text-[13px] font-bold text-muted-2">
          Nota
          <input name="note" defaultValue={expense.note ?? ""} placeholder="Opcional" className={inputClass} />
        </label>

        <button
          type="submit"
          className="h-[58px] rounded-[18px] bg-coral text-lg font-extrabold tracking-tight text-white"
        >
          Guardar
        </button>
      </form>

      <form action={deleteExpense} className="mt-3">
        <input type="hidden" name="id" value={expense.id} />
        <button
          type="submit"
          className="h-[50px] w-full rounded-[15px] border-[1.6px] border-[#E0A99C] font-bold text-coral-dark"
        >
          Eliminar gasto
        </button>
      </form>
    </div>
  );
}
