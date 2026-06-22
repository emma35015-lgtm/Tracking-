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
import { InfoButton } from "@/components/info-button";
import { Reveal } from "@/components/reveal";
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
    <div className="screen-in px-1 pt-2">
      <Link href="/" className="text-sm font-bold text-coral-link">
        ← Inicio
      </Link>
      <div className="mt-1 flex items-center gap-2">
        <h1 className="text-[34px] font-extrabold leading-[0.95] tracking-[-0.03em]">Pagos fijos</h1>
        <InfoButton
          title="Pagos fijos"
          text="Son las cosas que se repiten cada mes: suscripciones (como Netflix), compras a meses (MSI) y el recordatorio de cuándo pagar tu tarjeta. La app te avisa antes de cada cobro."
        />
      </div>
      <p className="mt-2 text-sm font-medium text-muted">
        Suscripciones, compras a meses y el recordatorio del pago de tu tarjeta.
      </p>

      {/* Lista actual — fichas de color encimadas */}
      {list.length > 0 && (
        <div className="mt-7 -mx-[14px]">
          {list.map((p, i) => {
            const prog = installmentProgress(p);
            const vigente = isActiveNow(p);
            const cardColor =
              p.color ||
              (p.category_id ? catColorById.get(p.category_id) : undefined) ||
              (p.kind === "card" ? "#e0532b" : "#D8CFB8");
            return (
              <div
                key={p.id}
                style={{ position: "relative", marginTop: i === 0 ? 0 : -22, zIndex: i + 1, opacity: vigente ? 1 : 0.6 }}
              >
              <Reveal>
              <div
                className="relative rounded-[28px] px-6 pb-5 pt-5 text-[#111]"
                style={{
                  background: cardColor,
                  boxShadow: "0 -10px 24px -12px rgba(0,0,0,0.28)",
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/10 text-[15px] font-extrabold tabular-nums text-[#111]">
                    {p.day_of_month}
                  </div>
                  <span className="rounded-full bg-black/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#111]">
                    {KIND_LABEL[p.kind]}
                  </span>
                </div>
                <div className="mt-6 flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-[22px] font-extrabold tracking-[-0.02em]">{p.name}</div>
                    <div className="text-[13px] font-semibold text-black/50">
                      {prog
                        ? prog.done
                          ? `Pagado · ${prog.total} de ${prog.total}`
                          : `Mensualidad ${prog.paid} de ${prog.total} · termina ${prog.endLabel}`
                        : `Cada día ${p.day_of_month}`}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[20px] font-extrabold tabular-nums">
                      {p.amount ? fmt(Number(p.amount)) : "—"}
                    </div>
                    <form action={deleteRecurringPayment}>
                      <input type="hidden" name="id" value={p.id} />
                      <button type="submit" className="text-[11px] font-bold text-black/45">
                        Eliminar
                      </button>
                    </form>
                  </div>
                </div>
              </div>
              </Reveal>
              </div>
            );
          })}
        </div>
      )}

      {/* Nueva suscripción */}
      <form action={addRecurringPayment} className="mt-10 border-t border-crema pt-6">
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
      <form action={addRecurringPayment} className="mt-10 border-t border-crema pt-6">
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
      <form action={addRecurringPayment} className="mt-10 border-t border-crema pt-6">
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
