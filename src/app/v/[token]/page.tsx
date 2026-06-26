import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { formatMoneyShort } from "@/lib/format";
import { tripBalances, tripPace } from "@/lib/trip-settle";
import { TripBoard } from "@/components/trip-board";
import { TripSettlement } from "@/components/trip-settlement";
import { SectionCard } from "@/components/section-card";
import { ArchiveList } from "@/components/archive-list";
import { joinTrip } from "@/app/(app)/viajes/actions";

// Vista pública de solo lectura del bote (sin cuenta).
// El share_token actúa como secreto; se sirve con la service-role key.
// Si quien la abre tiene sesión, puede unirse para agregar gastos.
export const dynamic = "force-dynamic";

const C_CUENTAS = "#9EC8E0";
const C_GASTOS = "#F4CF12";

export default async function PublicTripPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createAdminClient();

  const { data: trip } = await supabase
    .from("trips")
    .select("id, name, currency, status")
    .eq("share_token", token)
    .maybeSingle();
  if (!trip) notFound();

  const [{ data: people }, { data: contributions }, { data: expenses }] = await Promise.all([
    supabase.from("trip_people").select("id, name").eq("trip_id", trip.id).order("created_at"),
    supabase.from("trip_contributions").select("person_id, amount").eq("trip_id", trip.id),
    supabase
      .from("trip_expenses")
      .select("concept, amount, occurred_at")
      .eq("trip_id", trip.id)
      .order("occurred_at", { ascending: false }),
  ]);

  // ¿Quién está viendo? Si tiene sesión, ofrecemos unirse / abrir.
  const auth = await createClient();
  const {
    data: { user },
  } = await auth.auth.getUser();

  let membership: "owner" | "member" | null = null;
  if (user) {
    const { data: m } = await supabase
      .from("trip_members")
      .select("role")
      .eq("trip_id", trip.id)
      .eq("user_id", user.id)
      .maybeSingle();
    membership = (m?.role as "owner" | "member" | undefined) ?? null;
  }

  const peopleList = people ?? [];
  const contributionsList = contributions ?? [];
  const expensesList = expenses ?? [];
  const fmt = (n: number) => formatMoneyShort(n, trip.currency);

  const summary = tripBalances(peopleList, contributionsList, expensesList);
  const pace = tripPace(expensesList, summary.remainingCents);
  const statusLabel = trip.status === "cerrado" ? "Cerrado" : undefined;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-3 px-[18px] pb-16 pt-4 text-ink">
      <TripBoard
        tripName={trip.name}
        statusLabel={statusLabel}
        currency={trip.currency}
        summary={summary}
        pace={pace}
        peopleCount={peopleList.length}
      />

      {/* Acción para usuarios con cuenta */}
      {user ? (
        membership ? (
          <Link
            href={`/viajes/${trip.id}`}
            className="flex h-[52px] w-full items-center justify-center rounded-[16px] bg-coral text-base font-extrabold text-white"
          >
            Abrir en mis viajes
          </Link>
        ) : (
          <form action={joinTrip}>
            <input type="hidden" name="token" value={token} />
            <button
              type="submit"
              className="flex h-[52px] w-full items-center justify-center rounded-[16px] bg-coral text-base font-extrabold text-white"
            >
              Unirme a este viaje
            </button>
            <p className="mt-2 text-center text-xs font-medium text-muted">
              Podrás agregar tus propios gastos al bote.
            </p>
          </form>
        )
      ) : (
        <Link
          href="/login"
          className="flex h-[48px] w-full items-center justify-center rounded-[16px] bg-sand text-sm font-bold text-ink"
        >
          ¿Tienes la app? Inicia sesión para unirte
        </Link>
      )}

      {/* Tarjetas de sección con animación "archivero" */}
      <ArchiveList className="flex flex-col gap-3">
        {peopleList.length > 0 ? (
          <SectionCard color={C_CUENTAS} title="Cuentas finales">
            <TripSettlement
              people={peopleList}
              contributions={contributionsList}
              expenses={expensesList}
              currency={trip.currency}
            />
          </SectionCard>
        ) : null}

        {expensesList.length > 0 ? (
          <SectionCard color={C_GASTOS} title="En qué se ha gastado">
            <div className="flex flex-col divide-y divide-black/10">
              {expensesList.map((e, i) => (
                <div key={i} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0 flex-1 truncate text-[15px] font-medium">
                    {e.concept ?? "Gasto"}
                  </div>
                  <div className="ml-2 text-[15px] font-extrabold tabular-nums">{fmt(Number(e.amount))}</div>
                </div>
              ))}
            </div>
          </SectionCard>
        ) : null}
      </ArchiveList>

      <p className="mt-2 text-center text-xs font-medium text-muted">
        Vista de solo lectura · hecho con COCO
      </p>
    </main>
  );
}
