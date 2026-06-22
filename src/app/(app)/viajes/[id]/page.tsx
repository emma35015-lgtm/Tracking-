import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatMoneyShort } from "@/lib/format";
import { TripSummary } from "@/components/trip-summary";
import { ShareTripButton } from "@/components/share-trip-button";
import { ViajeDetalleIntro } from "@/components/viaje-detalle-intro";
import {
  addContribution,
  addPerson,
  addTripExpense,
  deleteContribution,
  deletePerson,
  deleteTripExpense,
  deleteTrip,
  leaveTrip,
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: trip } = await supabase
    .from("trips")
    .select("id, name, currency, status, share_token, user_id")
    .eq("id", id)
    .maybeSingle();
  if (!trip) notFound();

  const [{ data: people }, { data: contributions }, { data: expenses }, { data: members }] =
    await Promise.all([
      supabase.from("trip_people").select("id, name, user_id").eq("trip_id", id).order("created_at"),
      supabase
        .from("trip_contributions")
        .select("id, person_id, amount, added_by")
        .eq("trip_id", id)
        .order("created_at"),
      supabase
        .from("trip_expenses")
        .select("id, concept, amount, occurred_at, added_by")
        .eq("trip_id", id)
        .order("occurred_at", { ascending: false }),
      supabase.from("trip_members").select("user_id, role, display_name").eq("trip_id", id),
    ]);

  const peopleList = people ?? [];
  const contributionsList = contributions ?? [];
  const expensesList = expenses ?? [];
  const membersList = members ?? [];
  const currency = trip.currency;
  const fmt = (n: number) => formatMoneyShort(n, currency);
  const nameById = new Map(peopleList.map((p) => [p.id, p.name]));

  const myId = user?.id ?? "";
  const isOwner = trip.user_id === myId;
  const myPersonId = peopleList.find((p) => p.user_id === myId)?.id;
  const memberName = new Map(
    membersList.map((m) => [m.user_id, (m.display_name ?? "").trim() || "Miembro"])
  );
  const whoAdded = (addedBy: string | null) =>
    addedBy ? (addedBy === myId ? "Tú" : memberName.get(addedBy) ?? "Miembro") : null;
  // Puedo borrar lo que yo agregué; el dueño puede borrar cualquier cosa.
  const canDelete = (addedBy: string | null) => isOwner || (!!addedBy && addedBy === myId);

  return (
    <div className="screen-in flex flex-col gap-4">
      <ViajeDetalleIntro />
      <div className="mt-1.5 flex items-start justify-between gap-2">
        <div>
          <Link href="/viajes" className="text-sm font-bold text-coral-link">
            ← Viajes
          </Link>
          <h1 className="text-[30px] font-extrabold leading-[0.98] tracking-[-0.02em]">{trip.name}</h1>
          {membersList.length > 1 && (
            <div className="mt-0.5 text-xs font-medium text-muted">
              {membersList.length} personas en el bote{!isOwner && " · estás invitado"}
            </div>
          )}
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
      <div className="border-t border-crema pt-5">
        <h2 className="mb-3 text-[19px] font-extrabold tracking-tight">Gastos del bote</h2>
        {expensesList.length > 0 && (
          <div className="mb-3 flex flex-col divide-y divide-crema">
            {expensesList.map((e) => {
              const author = whoAdded(e.added_by);
              return (
                <div key={e.id} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-medium">{e.concept ?? "Gasto"}</div>
                    {author && <div className="text-xs font-medium text-muted">agregó {author}</div>}
                  </div>
                  <div className="ml-2 text-[15px] font-extrabold tabular-nums">{fmt(Number(e.amount))}</div>
                  {canDelete(e.added_by) && (
                    <form action={deleteTripExpense} className="ml-2">
                      <input type="hidden" name="trip_id" value={trip.id} />
                      <input type="hidden" name="id" value={e.id} />
                      <button type="submit" aria-label="Eliminar" className="px-1 text-muted">
                        ×
                      </button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <form action={addTripExpense} className="flex flex-col gap-2">
          <input type="hidden" name="trip_id" value={trip.id} />
          <input
            name="concept"
            required
            placeholder="¿En qué se gastó? Ej. Cena, gasolina, hotel…"
            className={inputClass}
          />
          <div className="flex gap-2">
            <input
              name="amount"
              inputMode="decimal"
              required
              placeholder="$ Monto"
              className={`${inputClass} flex-1`}
            />
            <button type="submit" className="rounded-xl bg-coral px-5 text-sm font-bold text-white">
              Agregar
            </button>
          </div>
        </form>
      </div>

      {/* Aportaciones */}
      <div className="border-t border-crema pt-5">
        <h2 className="mb-3 text-[19px] font-extrabold tracking-tight">Aportaciones</h2>
        {contributionsList.length > 0 && (
          <div className="mb-3 flex flex-col divide-y divide-crema">
            {contributionsList.map((c) => {
              const author = whoAdded(c.added_by);
              return (
                <div key={c.id} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-medium">
                      {c.person_id ? nameById.get(c.person_id) ?? "—" : "Sin asignar"}
                    </div>
                    {author && <div className="text-xs font-medium text-muted">agregó {author}</div>}
                  </div>
                  <div className="ml-2 text-[15px] font-extrabold tabular-nums">{fmt(Number(c.amount))}</div>
                  {canDelete(c.added_by) && (
                    <form action={deleteContribution} className="ml-2">
                      <input type="hidden" name="trip_id" value={trip.id} />
                      <input type="hidden" name="id" value={c.id} />
                      <button type="submit" aria-label="Eliminar" className="px-1 text-muted">
                        ×
                      </button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {peopleList.length === 0 ? (
          <p className="text-sm font-medium text-muted">Agrega personas abajo para registrar quién aporta.</p>
        ) : (
          <form action={addContribution} className="flex gap-2">
            <input type="hidden" name="trip_id" value={trip.id} />
            <select name="person_id" defaultValue={myPersonId} className={`${inputClass} flex-1`}>
              {peopleList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.user_id === myId ? " (tú)" : ""}
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
      <div className="border-t border-crema pt-5">
        <h2 className="mb-3 text-[19px] font-extrabold tracking-tight">Personas</h2>
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
                  {p.name}
                  {p.user_id === myId ? <span className="text-muted-3">(tú)</span> : null}{" "}
                  <span className="text-muted">×</span>
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

      {/* Invitar amigos */}
      <div className="rounded-[22px] bg-mint px-5 py-4 text-[13px] font-medium leading-relaxed text-mint-ink">
        👋 Comparte el link (botón de arriba) con amigos que ya tengan la app. Al abrirlo podrán
        unirse y agregar sus propios gastos al bote. Cada quien edita solo lo suyo.
      </div>

      {/* Acciones del viaje */}
      {isOwner ? (
        <>
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
        </>
      ) : (
        <form action={leaveTrip}>
          <input type="hidden" name="trip_id" value={trip.id} />
          <button type="submit" className="h-[44px] w-full rounded-[14px] text-sm font-bold text-coral-dark">
            Salir del viaje
          </button>
        </form>
      )}
    </div>
  );
}
