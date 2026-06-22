import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { InfoButton } from "@/components/info-button";
import { ViajesIntro } from "@/components/viajes-intro";
import { ArchiveList } from "@/components/archive-list";
import { createTrip } from "./actions";

const inputClass =
  "w-full rounded-2xl border-[1.6px] border-input-border bg-input px-4 py-3 text-[15px] font-medium outline-none focus:border-coral";
const TRIP_COLORS = ["#A7D9BF", "#9EC8E0", "#C9B8E8", "#F2B79F", "#F4CF12", "#D995AF"];

export default async function ViajesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // RLS devuelve tanto los viajes propios como aquellos en los que te invitaron.
  const { data: trips } = await supabase
    .from("trips")
    .select("id, name, status, currency, created_at, user_id")
    .order("created_at", { ascending: false });

  const list = trips ?? [];
  const myId = user?.id ?? "";

  return (
    <div className="screen-in px-1 pt-2">
      <ViajesIntro />
      <div className="flex items-center gap-2">
        <h1 className="text-[34px] font-extrabold leading-[0.95] tracking-[-0.03em]">Viajes</h1>
        <InfoButton
          title="Viajes (bote compartido)"
          text="Un viaje es un bote entre amigos: cada quien anota lo que pone y lo que se gasta, y la app saca cuánto le toca a cada quien. Comparte el link para que se unan y todos anoten."
        />
      </div>
      <p className="mt-2 text-sm font-medium text-muted">
        El bote compartido: cuánto entró, cuánto se gastó y quién queda a mano.
      </p>

      {list.length > 0 && (
        <ArchiveList className="mt-7 -mx-[14px]">
          {list.map((t, i) => (
            <div key={t.id} style={{ position: "relative", marginTop: i === 0 ? 0 : -22, zIndex: i + 1 }}>
            <Link
              href={`/viajes/${t.id}`}
              className="relative block rounded-[28px] px-6 pb-5 pt-5 text-[#111]"
              style={{
                background: TRIP_COLORS[i % TRIP_COLORS.length],
                boxShadow: "0 -10px 24px -12px rgba(0,0,0,0.28)",
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/10">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#111111" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                {t.user_id !== myId && (
                  <span className="rounded-full bg-black/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#111]">
                    Invitado
                  </span>
                )}
              </div>
              <div className="mt-6 flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-[24px] font-extrabold tracking-[-0.02em]">{t.name}</div>
                  <div className="text-[13px] font-semibold text-black/50">
                    {t.status === "cerrado" ? "Cerrado" : "Activo"}
                  </div>
                </div>
                <span className="flex-none text-2xl font-extrabold">→</span>
              </div>
            </Link>
            </div>
          ))}
        </ArchiveList>
      )}

      {/* Nuevo viaje — abierto */}
      <form action={createTrip} className="mt-12">
        <h2 className="text-[20px] font-extrabold tracking-tight">Nuevo viaje</h2>
        <div className="mb-2 mt-4 text-[13px] font-bold text-muted-2">Nombre</div>
        <input name="name" required placeholder="Playa con amigos" className={inputClass} />
        <div className="mb-2 mt-4 text-[13px] font-bold text-muted-2">
          Quiénes van <span className="font-medium text-muted">(un nombre por línea o separados por coma)</span>
        </div>
        <textarea
          name="people"
          rows={3}
          placeholder="Emma&#10;Ana&#10;Luis"
          className={inputClass}
        />
        <input type="hidden" name="currency" value="MXN" />
        <button
          type="submit"
          className="mt-5 h-[52px] w-full rounded-[16px] bg-coral text-base font-extrabold text-white"
        >
          Crear viaje
        </button>
      </form>
    </div>
  );
}
