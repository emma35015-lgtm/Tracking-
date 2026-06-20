import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatMoneyShort } from "@/lib/format";
import { categoryColor } from "@/lib/category-style";
import {
  installmentProgress,
  isActiveNow,
  KIND_LABEL,
  type RecurringPayment,
} from "@/lib/finance";
import { ColorSwatches } from "@/components/color-swatches";
import { addRecurringPayment, deleteRecurringPayment } from "../actions";

const inputClass =
  "w-full rounded-[14px] border-[1.6px] border-input-border bg-input px-[15px] py-[13px] text-[15px] font-medium text-ink outline-none focus:border-coral";
const labelClass = "mb-1.5 mt-3 text-[13px] font-bold text-muted-2";

export default async function FijosPage() {
  const supabase = await createClient();
  const [{ data: payments }, { data: categories }, { data: profile }] = await Promise.all([
    supabase
      .from("recurring_payments")
      .select("id, kind, name, amount, currency, day_of_month, category_id, total_months, start_date, active, color")
      .order("day_of_month"),
    supabase.from("categories").select("id, name, color").order("name"),
    supabase.from("profiles").select("default_currency").maybeSingle(),
  ]);

  const list = (payments ?? []) as RecurringPayment[];
  const cats = categories ?? [];
  const catColorById = new Map(cats.map((c) => [c.id, categoryColor(c.name, c.color)] as const));
  const currency = profile?.default_currency ?? "MXN";
  const fmt = (n: number) => formatMoneyShort(n, currency);

  return (
    <div className="screen-in flex flex-col gap-4">
      <div className="mt-1.5">
        <Link href="/" className="text-sm font-bold text-coral-link">
          ← Inicio
        </Link>
        <h1 className="text-[26px] font-extrabold tracking-tight">Pagos fijos</h1>
        <p className="mt-1 text-sm font-medium text-muted">
          Suscripciones, compras a meses y el recordatorio del pago de tu tarjeta.
        </p>
      </div>

      {/* Lista actual */}
      {list.length > 0 && (
        <div className="flex flex-col gap-2">
          {list.map((p, i) => {
            const prog = installmentProgress(p);
            const vigente = isActiveNow(p);
            const dayColor =
              p.color ||
              (p.category_id ? catColorById.get(p.category_id) : undefined) ||
              (p.kind === "card" ? "#FF6518" : "var(--color-sand)");
            return (
              <div
                key={p.id}
                className={`flex items-center gap-3.5 rounded-[22px] bg-white px-[17px] py-[15px] ${
                  vigente ? "" : "opacity-60"
                }`}
                style={{ animation: `slide-r .5s ${(0.05 + i * 0.06).toFixed(2)}s both` }}
              >
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] text-xs font-extrabold tabular-nums text-ink"
                  style={{ background: dayColor }}
                >
                  {p.day_of_month}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-base font-bold tracking-tight">{p.name}</span>
                    <span className="shrink-0 rounded-full bg-crema px-2 py-0.5 text-[10px] font-bold uppercase text-muted-2">
                      {KIND_LABEL[p.kind]}
                    </span>
                  </div>
                  <div className="text-xs font-medium text-muted">
                    {prog
                      ? prog.done
                        ? `Pagado · ${prog.total} de ${prog.total}`
                        : `Mensualidad ${prog.paid} de ${prog.total} · termina ${prog.endLabel}`
                      : `Cada día ${p.day_of_month}`}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[15px] font-extrabold tabular-nums">
                    {p.amount ? fmt(Number(p.amount)) : "—"}
                  </div>
                  <form action={deleteRecurringPayment}>
                    <input type="hidden" name="id" value={p.id} />
                    <button type="submit" className="text-[11px] font-bold text-coral-dark">
                      Eliminar
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Nueva suscripción */}
      <form action={addRecurringPayment} className="rounded-[24px] bg-white p-5">
        <input type="hidden" name="kind" value="subscription" />
        <h2 className="text-base font-extrabold tracking-tight">Nueva suscripción</h2>
        <p className="mt-0.5 text-[13px] font-medium text-muted">Netflix, Spotify, gym…</p>
        <div className={labelClass}>Nombre</div>
        <input name="name" required placeholder="Ej. Netflix" className={inputClass} />
        <div className="flex gap-2">
          <div className="flex-1">
            <div className={labelClass}>Monto al mes</div>
            <input name="amount" inputMode="decimal" required placeholder="$ 199" className={inputClass} />
          </div>
          <div className="w-28">
            <div className={labelClass}>Día de cobro</div>
            <input name="day_of_month" inputMode="numeric" required placeholder="5" className={inputClass} />
          </div>
        </div>
        <div className={labelClass}>Categoría</div>
        <CategorySelect cats={cats} defaultName="Suscripciones" />
        <div className={labelClass}>Color</div>
        <ColorSwatches name="color" defaultValue="#D995AF" />
        <button type="submit" className="mt-4 h-[50px] w-full rounded-[15px] bg-coral text-base font-extrabold text-white">
          Agregar suscripción
        </button>
      </form>

      {/* Nuevo pago a meses */}
      <form action={addRecurringPayment} className="rounded-[24px] bg-white p-5">
        <input type="hidden" name="kind" value="installment" />
        <h2 className="text-base font-extrabold tracking-tight">Pago a meses</h2>
        <p className="mt-0.5 text-[13px] font-medium text-muted">
          Una compra a mensualidades (MSI). Lleva la cuenta de cuántas faltan.
        </p>
        <div className={labelClass}>Qué compraste</div>
        <input name="name" required placeholder="Ej. Celular" className={inputClass} />
        <div className="flex gap-2">
          <div className="flex-1">
            <div className={labelClass}>Mensualidad</div>
            <input name="amount" inputMode="decimal" required placeholder="$ 1,200" className={inputClass} />
          </div>
          <div className="w-28">
            <div className={labelClass}>Día de cobro</div>
            <input name="day_of_month" inputMode="numeric" required placeholder="15" className={inputClass} />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="w-28">
            <div className={labelClass}>Meses</div>
            <input name="total_months" inputMode="numeric" required placeholder="12" className={inputClass} />
          </div>
          <div className="flex-1">
            <div className={labelClass}>Empezó el</div>
            <input name="start_date" type="date" className={inputClass} />
          </div>
        </div>
        <div className={labelClass}>Categoría</div>
        <CategorySelect cats={cats} defaultName="Otros" />
        <div className={labelClass}>Color</div>
        <ColorSwatches name="color" defaultValue="#9EC8E0" />
        <button type="submit" className="mt-4 h-[50px] w-full rounded-[15px] bg-coral text-base font-extrabold text-white">
          Agregar pago a meses
        </button>
      </form>

      {/* Recordatorio de tarjeta */}
      <form action={addRecurringPayment} className="rounded-[24px] bg-white p-5">
        <input type="hidden" name="kind" value="card" />
        <h2 className="text-base font-extrabold tracking-tight">Pago de tarjeta</h2>
        <p className="mt-0.5 text-[13px] font-medium text-muted">
          Te avisamos cuando se acerca tu fecha límite de pago. El monto es opcional (suele variar).
        </p>
        <div className={labelClass}>Nombre de la tarjeta</div>
        <input name="name" required placeholder="Ej. Banamex Oro" className={inputClass} />
        <div className="flex gap-2">
          <div className="flex-1">
            <div className={labelClass}>
              Monto <span className="font-medium text-muted">(opcional)</span>
            </div>
            <input name="amount" inputMode="decimal" placeholder="Déjalo vacío si varía" className={inputClass} />
          </div>
          <div className="w-32">
            <div className={labelClass}>Día límite</div>
            <input name="day_of_month" inputMode="numeric" required placeholder="20" className={inputClass} />
          </div>
        </div>
        <div className={labelClass}>Color</div>
        <ColorSwatches name="color" defaultValue="#FF6518" />
        <button type="submit" className="mt-4 h-[50px] w-full rounded-[15px] bg-ink text-base font-extrabold text-white">
          Agregar tarjeta
        </button>
      </form>
    </div>
  );
}

function CategorySelect({ cats, defaultName }: { cats: { id: string; name: string }[]; defaultName: string }) {
  const fallback = cats.find((c) => c.name === defaultName)?.id ?? "";
  return (
    <select name="category_id" defaultValue={fallback} className={inputClass}>
      <option value="">Sin categoría</option>
      {cats.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
