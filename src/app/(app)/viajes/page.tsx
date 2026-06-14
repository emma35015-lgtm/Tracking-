import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createTrip } from "./actions";

const inputClass =
  "w-full rounded-2xl border-[1.6px] border-input-border bg-input px-4 py-3 text-[15px] font-medium outline-none focus:border-coral";

export default async function ViajesPage() {
  const supabase = await createClient();
  const { data: trips } = await supabase
    .from("trips")
    .select("id, name, status, currency, created_at")
    .order("created_at", { ascending: false });

  const list = trips ?? [];

  return (
    <div className="screen-in">
      <h1 className="mt-1.5 text-[26px] font-extrabold tracking-tight">Viajes</h1>
      <p className="mt-1 text-sm font-medium text-muted">
        El bote compartido: cuánto entró, cuánto se gastó y quién queda a mano.
      </p>

      {list.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          {list.map((t) => (
            <Link
              key={t.id}
              href={`/viajes/${t.id}`}
              className="flex items-center gap-3.5 rounded-[22px] bg-white px-[17px] py-[15px]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-mint">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1E4435" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-base font-bold tracking-tight">{t.name}</div>
                <div className="text-xs font-medium text-muted">
                  {t.status === "cerrado" ? "Cerrado" : "Activo"}
                </div>
              </div>
              <svg width="9" height="15" viewBox="0 0 9 15" fill="none" stroke="#8A8167" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1.5 1.5 7.5 7.5l-6 6" />
              </svg>
            </Link>
          ))}
        </div>
      )}

      {/* Nuevo viaje */}
      <form action={createTrip} className="mt-4 rounded-[24px] bg-white p-5">
        <h2 className="mb-3 text-base font-extrabold tracking-tight">Nuevo viaje</h2>
        <div className="mb-2 text-[13px] font-bold text-muted-2">Nombre</div>
        <input name="name" required placeholder="Playa con amigos" className={inputClass} />
        <div className="mb-2 mt-3 text-[13px] font-bold text-muted-2">
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
          className="mt-4 h-[52px] w-full rounded-[16px] bg-coral text-base font-extrabold text-white"
        >
          Crear viaje
        </button>
      </form>
    </div>
  );
}
