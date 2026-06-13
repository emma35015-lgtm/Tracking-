import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatMoneyShort } from "@/lib/format";
import { TripSummary } from "@/components/trip-summary";
import { ShareTripButton } from "@/components/share-trip-button";
import {
  addContribution,
  addPerson,
  addTripExpense,
  deleteContribution,
  deletePerson,
  deleteTripExpense,
  deleteTrip,
  setTripStatus,
} from "../actions";

const inputClass =
  "w-full rounded-xl border-[1.6px] border-input-border bg-input px-3 py-2.5 text-sm font-medium outline-none focus:border-coral";

export default async function ViajeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: trip } = await supabase
    .from("trips")
    .select("id, name, currency, status, share_token")
    .eq("id", id)
    .maybeSingle();
  if (!trip) notFound();

  const [{ data: people }, { data: contributions }, { data: expenses }] = await Promise.all([
    supabase.from("trip_people").select("id, name").eq("trip_id", id).order("created_at"),
    supabase
      .from("trip_contributions")
      .select("id, person_id, amount")
      .eq("trip_id", id)
      .order("created_at"),
    supabase
      .from("trip_expenses")
      .select("id, concept, amount, occurred_at")
      .eq("trip_id", id)
      .order("occurred_at", { ascending: false }),
  ]);

  const peopleList = people ?? [];
  const contributionsList = contributions ?? [];
  const expensesList = expenses ?? [];
  const currency = trip.currency;
  const fmt = (n: number) => formatMoneyShort(n, currency);
  const nameById = new Map(peopleList.map((p) => [p.id, p.name]));

  return (
    <div className="screen-in flex flex-col gap-4">
      <div className="mt-1.5 flex items-start justify-between gap-2">
        <div>
          <Link href="/viajes" className="text-sm font-bold text-coral-link">
            ← Viajes
          </Link>
          <h1 className="text-[24px] font-extrabold tracking-tight">{trip.name}</h1>
        </div>
        <ShareTripButton token={trip.share_token} />
      </div>

      <TripSummary
        people={peopleList}
        contributions={contributionsList}
        expenses={expensesList}
        currency={currency}
      />

      {/* Gastos del bote */}
      <div className="rounded-[24px] bg-white p-5">
        <h2 className="mb-3 text-base font-extrabold tracking-tight">Gastos del bote</h2>
        {expensesList.length > 0 && (
          <div className="mb-3 flex flex-col divide-y divide-crema">
            {expensesList.map((e) => (
              <div key={e.id} className="flex items-center justify-between py-2.5">
                <div className="min-w-0 flex-1 truncate text-[15px] font-medium">
                  {e.concept ?? "Gasto"}
                </div>
                <div className="ml-2 text-[15px] font-extrabold tabular-nums">{fmt(Number(e.amount))}</div>
                <form action={deleteTripExpense} className="ml-2">
                  <input type="hidden" name="trip_id" value={trip.id} />
                  <input type="hidden" name="id" value={e.id} />
                  <button type="submit" aria-label="Eliminar" className="px-1 text-muted">
                    ×
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
        <form action={addTripExpense} className="flex gap-2">
          <input type="hidden" name="trip_id" value={trip.id} />
          <input name="concept" placeholder="Concepto" className={`${inputClass} flex-1`} />
          <input name="amount" inputMode="decimal" placeholder="$" className={`${inputClass} w-24`} />
          <button type="submit" className="rounded-xl bg-coral px-4 text-sm font-bold text-white">
            +
          </button>
        </form>
      </div>

      {/* Aportaciones */}
      <div className="rounded-[24px] bg-white p-5">
        <h2 className="mb-3 text-base font-extrabold tracking-tight">Aportaciones</h2>
        {contributionsList.length > 0 && (
          <div className="mb-3 flex flex-col divide-y divide-crema">
            {contributionsList.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-2.5">
                <div className="min-w-0 flex-1 truncate text-[15px] font-medium">
                  {c.person_id ? nameById.get(c.person_id) ?? "—" : "Sin asignar"}
                </div>
                <div className="ml-2 text-[15px] font-extrabold tabular-nums">{fmt(Number(c.amount))}</div>
                <form action={deleteContribution} className="ml-2">
                  <input type="hidden" name="trip_id" value={trip.id} />
                  <input type="hidden" name="id" value={c.id} />
                  <button type="submit" aria-label="Eliminar" className="px-1 text-muted">
                    ×
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
        {peopleList.length === 0 ? (
          <p className="text-sm font-medium text-muted">Agrega personas abajo para registrar quién aporta.</p>
        ) : (
          <form action={addContribution} className="flex gap-2">
            <input type="hidden" name="trip_id" value={trip.id} />
            <select name="person_id" className={`${inputClass} flex-1`}>
              {peopleList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <input name="amount" inputMode="decimal" placeholder="$" className={`${inputClass} w-24`} />
            <button type="submit" className="rounded-xl bg-coral px-4 text-sm font-bold text-white">
              +
            </button>
          </form>
        )}
      </div>

      {/* Personas */}
      <div className="rounded-[24px] bg-white p-5">
        <h2 className="mb-3 text-base font-extrabold tracking-tight">Personas</h2>
        {peopleList.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {peopleList.map((p) => (
              <form key={p.id} action={deletePerson}>
                <input type="hidden" name="trip_id" value={trip.id} />
                <input type="hidden" name="id" value={p.id} />
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-full border-[1.6px] border-input-border bg-input px-3 py-1.5 text-sm font-semibold"
                >
                  {p.name} <span className="text-muted">×</span>
                </button>
              </form>
            ))}
          </div>
        )}
        <form action={addPerson} className="flex gap-2">
          <input type="hidden" name="trip_id" value={trip.id} />
          <input name="name" placeholder="Nombre" className={`${inputClass} flex-1`} />
          <button type="submit" className="rounded-xl bg-ink px-4 text-sm font-bold text-white">
            Añadir
          </button>
        </form>
      </div>

      {/* Acciones del viaje */}
      <form action={setTripStatus}>
        <input type="hidden" name="trip_id" value={trip.id} />
        <input type="hidden" name="status" value={trip.status === "cerrado" ? "activo" : "cerrado"} />
        <button type="submit" className="h-[48px] w-full rounded-[14px] bg-sand font-bold text-ink">
          {trip.status === "cerrado" ? "Reabrir viaje" : "Cerrar viaje"}
        </button>
      </form>
      <form action={deleteTrip}>
        <input type="hidden" name="trip_id" value={trip.id} />
        <button type="submit" className="h-[44px] w-full rounded-[14px] text-sm font-bold text-coral-dark">
          Eliminar viaje
        </button>
      </form>
    </div>
  );
}
