import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatMoneyShort } from "@/lib/format";
import { tripBalances, tripPace } from "@/lib/trip-settle";
import { TripBoard } from "@/components/trip-board";
import { TripSettlement } from "@/components/trip-settlement";
import { SectionCard } from "@/components/section-card";
import { ArchiveList } from "@/components/archive-list";
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

// Colores de cada sección (tarjetas pastel sobre el fondo crema)
const C_CUENTAS = "#9EC8E0";
const C_GASTOS = "#F4CF12";
const C_APORTA = "#A7D9BF";
const C_PERSONAS = "#C9B8E8";

// Inputs claros, para vivir sobre las tarjetas pastel
const inputClass =
  "w-full rounded-xl border-[1.6px] border-black/10 bg-white/60 px-3 py-2.5 text-sm font-medium text-[#1a1714] placeholder-black/35 outline-none focus:border-coral";
const cardBtn = "rounded-xl bg-[#1a1714] px-5 text-sm font-bold text-[#ece4d2]";

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

  const summary = tripBalances(peopleList, contributionsList, expensesList);
  const pace = tripPace(expensesList, summary.remainingCents);

  const myId = user?.id ?? "";
  const isOwner = trip.user_id === myId;
  const myPersonId = peopleList.find((p) => p.user_id === myId)?.id;
  const statusLabel = !isOwner ? "Invitado" : trip.status === "cerrado" ? "Cerrado" : undefined;
  const memberName = new Map(
    membersList.map((m) => [m.user_id, (m.display_name ?? "").trim() || "Miembro"])
  );
  const whoAdded = (addedBy: string | null) =>
    addedBy ? (addedBy === myId ? "Tú" : memberName.get(addedBy) ?? "Miembro") : null;
  // Puedo borrar lo que yo agregué; el dueño puede borrar cualquier cosa.
  const canDelete = (addedBy: string | null) => isOwner || (!!addedBy && addedBy === myId);

  return (
    <div className="screen-in flex flex-col gap-3 text-ink">
      <ViajeDetalleIntro />

      <TripBoard
        tripName={trip.name}
        statusLabel={statusLabel}
        currency={currency}
        summary={summary}
        pace={pace}
        peopleCount={peopleList.length}
        backHref="/viajes"
        topRight={<ShareTripButton token={trip.share_token} />}
      />

      {/* Tarjetas de sección con animación "archivero" (como Inicio) */}
      <ArchiveList className="flex flex-col gap-3">
        {/* Cuentas finales */}
        {peopleList.length > 0 ? (
          <SectionCard color={C_CUENTAS} title="Cuentas finales">
            <TripSettlement
              people={peopleList}
              contributions={contributionsList}
              expenses={expensesList}
              currency={currency}
            />
          </SectionCard>
        ) : null}

        {/* Gastos del bote */}
        <SectionCard color={C_GASTOS} title="Gastos del bote">
          {expensesList.length > 0 && (
            <div className="mb-3 flex flex-col divide-y divide-black/10">
              {expensesList.map((e) => {
                const author = whoAdded(e.added_by);
                return (
                  <div key={e.id} className="flex items-center justify-between py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-medium">{e.concept ?? "Gasto"}</div>
                      {author && <div className="text-xs font-medium text-black/45">agregó {author}</div>}
                    </div>
                    <div className="ml-2 text-[15px] font-extrabold tabular-nums">{fmt(Number(e.amount))}</div>
                    {canDelete(e.added_by) && (
                      <form action={deleteTripExpense} className="ml-2">
                        <input type="hidden" name="trip_id" value={trip.id} />
                        <input type="hidden" name="id" value={e.id} />
                        <button type="submit" aria-label="Eliminar" className="px-1 text-black/40">
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
              <button type="submit" className={cardBtn}>
                Agregar
              </button>
            </div>
          </form>
        </SectionCard>

        {/* Aportaciones */}
        <SectionCard color={C_APORTA} title="Aportaciones">
          {contributionsList.length > 0 && (
            <div className="mb-3 flex flex-col divide-y divide-black/10">
              {contributionsList.map((c) => {
                const author = whoAdded(c.added_by);
                return (
                  <div key={c.id} className="flex items-center justify-between py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-medium">
                        {c.person_id ? nameById.get(c.person_id) ?? "—" : "Sin asignar"}
                      </div>
                      {author && <div className="text-xs font-medium text-black/45">agregó {author}</div>}
                    </div>
                    <div className="ml-2 text-[15px] font-extrabold tabular-nums">{fmt(Number(c.amount))}</div>
                    {canDelete(c.added_by) && (
                      <form action={deleteContribution} className="ml-2">
                        <input type="hidden" name="trip_id" value={trip.id} />
                        <input type="hidden" name="id" value={c.id} />
                        <button type="submit" aria-label="Eliminar" className="px-1 text-black/40">
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
            <p className="text-sm font-medium text-black/55">Agrega personas abajo para registrar quién aporta.</p>
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
              <button type="submit" className="rounded-xl bg-[#1a1714] px-4 text-sm font-bold text-[#ece4d2]">
                +
              </button>
            </form>
          )}
        </SectionCard>

        {/* Personas */}
        <SectionCard color={C_PERSONAS} title="Personas">
          {peopleList.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {peopleList.map((p) => (
                <form key={p.id} action={deletePerson}>
                  <input type="hidden" name="trip_id" value={trip.id} />
                  <input type="hidden" name="id" value={p.id} />
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 rounded-full border-[1.6px] border-black/10 bg-white/50 px-3 py-1.5 text-sm font-semibold"
                  >
                    {p.name}
                    {p.user_id === myId ? <span className="text-black/45">(tú)</span> : null}{" "}
                    <span className="text-black/40">×</span>
                  </button>
                </form>
              ))}
            </div>
          )}
          <form action={addPerson} className="flex gap-2">
            <input type="hidden" name="trip_id" value={trip.id} />
            <input name="name" placeholder="Nombre" className={`${inputClass} flex-1`} />
            <button type="submit" className="rounded-xl bg-[#1a1714] px-4 text-sm font-bold text-[#ece4d2]">
              Añadir
            </button>
          </form>
        </SectionCard>
      </ArchiveList>

      {/* Invitar amigos — pista discreta sobre el fondo */}
      <div className="rounded-[22px] border border-input-border px-5 py-4 text-[13px] font-medium leading-relaxed text-muted-2">
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
            <button type="submit" className="h-[44px] w-full rounded-[14px] text-sm font-bold text-coral">
              Eliminar viaje
            </button>
          </form>
        </>
      ) : (
        <form action={leaveTrip}>
          <input type="hidden" name="trip_id" value={trip.id} />
          <button type="submit" className="h-[44px] w-full rounded-[14px] text-sm font-bold text-coral">
            Salir del viaje
          </button>
        </form>
      )}
    </div>
  );
}
