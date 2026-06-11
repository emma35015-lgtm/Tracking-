import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  addCategory,
  deleteCategory,
  revokeToken,
  signOut,
  updateProfile,
} from "@/app/(app)/actions";

const CURRENCIES = ["MXN", "USD", "EUR", "COP", "ARS", "CLP", "PEN"];

export default async function AjustesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: categories }, { data: token }] = await Promise.all([
    supabase.from("profiles").select("display_name, default_currency").maybeSingle(),
    supabase.from("categories").select("id, name, icon").order("name"),
    supabase.from("api_tokens").select("label, created_at, last_used_at").maybeSingle(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="mb-3 text-lg font-bold">Ajustes</h1>
        <form action={updateProfile} className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-xs text-zinc-400">{user?.email}</p>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Tu nombre
            <input
              name="display_name"
              defaultValue={profile?.display_name ?? ""}
              placeholder="Opcional"
              className="rounded-xl border border-zinc-300 px-4 py-2.5 outline-none focus:border-brand"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Moneda
            <select
              name="default_currency"
              defaultValue={profile?.default_currency ?? "MXN"}
              className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 outline-none focus:border-brand"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="rounded-xl bg-brand px-4 py-2.5 font-semibold text-white">
            Guardar
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-500">Automatización del iPhone</h2>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          {token ? (
            <div className="flex flex-col gap-2 text-sm">
              <p>
                ✅ Token <span className="font-medium">{token.label}</span> activo
                {token.last_used_at
                  ? ` · usado por última vez el ${new Date(token.last_used_at).toLocaleDateString("es-MX")}`
                  : " · aún sin usarse"}
              </p>
              <div className="flex gap-2">
                <Link
                  href="/ajustes/atajos"
                  className="flex-1 rounded-xl bg-brand px-4 py-2.5 text-center font-semibold text-white"
                >
                  Ver instrucciones
                </Link>
                <form action={revokeToken} className="flex-1">
                  <button
                    type="submit"
                    className="w-full rounded-xl border border-red-200 px-4 py-2.5 font-semibold text-red-600"
                  >
                    Revocar token
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 text-sm">
              <p className="text-zinc-600">
                Conecta tu iPhone para que tus pagos con Apple Pay se registren solos.
              </p>
              <Link
                href="/ajustes/atajos"
                className="rounded-xl bg-brand px-4 py-2.5 text-center font-semibold text-white"
              >
                Configurar mi iPhone
              </Link>
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-500">Categorías</h2>
        <ul className="mb-3 divide-y divide-zinc-100 overflow-hidden rounded-2xl bg-white shadow-sm">
          {(categories ?? []).map((c) => (
            <li key={c.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span>
                {c.icon} {c.name}
              </span>
              <form action={deleteCategory}>
                <input type="hidden" name="id" value={c.id} />
                <button type="submit" className="text-xs text-red-500" aria-label={`Eliminar ${c.name}`}>
                  Eliminar
                </button>
              </form>
            </li>
          ))}
        </ul>
        <form action={addCategory} className="flex gap-2">
          <input
            name="icon"
            placeholder="🛍️"
            maxLength={4}
            className="w-16 rounded-xl border border-zinc-300 bg-white px-2 py-2.5 text-center outline-none focus:border-brand"
          />
          <input
            name="name"
            required
            placeholder="Nueva categoría"
            className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 outline-none focus:border-brand"
          />
          <button type="submit" className="rounded-xl bg-zinc-900 px-4 py-2.5 font-semibold text-white">
            Añadir
          </button>
        </form>
        <p className="mt-2 text-xs text-zinc-400">
          Al eliminar una categoría, sus gastos quedan como &quot;Sin categoría&quot;.
        </p>
      </section>

      <form action={signOut}>
        <button type="submit" className="w-full rounded-xl border border-zinc-300 px-4 py-3 font-semibold text-zinc-600">
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}
