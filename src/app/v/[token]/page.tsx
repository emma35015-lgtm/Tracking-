import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMoneyShort } from "@/lib/format";
import { TripSummary } from "@/components/trip-summary";

// Vista pública de solo lectura del bote (sin cuenta).
// El share_token actúa como secreto; se sirve con la service-role key.
export const dynamic = "force-dynamic";

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

  const expensesList = expenses ?? [];
  const fmt = (n: number) => formatMoneyShort(n, trip.currency);

  return (
    <main className="mx-auto w-full max-w-lg px-[18px] pb-16 pt-4">
      <div className="mb-1 flex items-center justify-center gap-1.5 text-[13px] font-bold uppercase tracking-wider text-muted">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        Bote de viaje
      </div>
      <h1 className="mb-4 text-center text-[26px] font-extrabold tracking-tight">{trip.name}</h1>

      <TripSummary
        people={people ?? []}
        contributions={contributions ?? []}
        expenses={expensesList}
        currency={trip.currency}
      />

      {expensesList.length > 0 && (
        <div className="mt-4 rounded-[24px] bg-white p-5">
          <h2 className="mb-3 text-base font-extrabold tracking-tight">En qué se ha gastado</h2>
          <div className="flex flex-col divide-y divide-crema">
            {expensesList.map((e, i) => (
              <div key={i} className="flex items-center justify-between py-2.5">
                <div className="min-w-0 flex-1 truncate text-[15px] font-medium">
                  {e.concept ?? "Gasto"}
                </div>
                <div className="ml-2 text-[15px] font-extrabold tabular-nums">{fmt(Number(e.amount))}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-6 text-center text-xs font-medium text-muted">
        Vista de solo lectura · hecho con Gastos
      </p>
    </main>
  );
}
