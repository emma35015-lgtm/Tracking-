import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  addCategory,
  deleteCategory,
  revokeToken,
  signOut,
  updateProfile,
} from "@/app/(app)/actions";
import { CategoryIcon, categoryColor } from "@/lib/category-style";

const CURRENCIES: [string, string][] = [
  ["MXN", "Peso mexicano"],
  ["USD", "Dólar"],
  ["EUR", "Euro"],
  ["COP", "Peso colombiano"],
  ["ARS", "Peso argentino"],
  ["CLP", "Peso chileno"],
  ["PEN", "Sol peruano"],
];

const inputClass =
  "w-full rounded-[14px] border-[1.6px] border-input-border bg-input px-[15px] py-[13px] text-[15px] font-medium text-ink outline-none focus:border-coral";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-1 mb-3 mt-6 text-[13px] font-bold uppercase tracking-[0.06em] text-muted">
      {children}
    </div>
  );
}

export default async function AjustesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: categories }, { data: token }, { data: budgetRow }] =
    await Promise.all([
      supabase.from("profiles").select("display_name, default_currency").maybeSingle(),
      supabase.from("categories").select("id, name, icon").order("name"),
      supabase.from("api_tokens").select("label, created_at, last_used_at").maybeSingle(),
      // Aparte: si la columna no existe (migración pendiente), no rompe el resto.
      supabase.from("profiles").select("monthly_budget").maybeSingle(),
    ]);

  const monthlyBudget = budgetRow?.monthly_budget ? Number(budgetRow.monthly_budget) : null;

  return (
    <div className="screen-in">
      <h1 className="mt-1.5 text-[26px] font-extrabold tracking-tight">Ajustes</h1>

      {/* Perfil */}
      <form action={updateProfile} className="mt-[18px] rounded-[24px] bg-white p-5">
        <div className="text-[13px] font-medium text-muted">{user?.email}</div>
        <div className="mb-2 mt-4 text-[13px] font-bold text-muted-2">Tu nombre</div>
        <input
          name="display_name"
          defaultValue={profile?.display_name ?? ""}
          placeholder="Opcional"
          className={inputClass}
        />
        <div className="mb-2 mt-4 text-[13px] font-bold text-muted-2">Moneda</div>
        <select
          name="default_currency"
          defaultValue={profile?.default_currency ?? "MXN"}
          className={inputClass}
        >
          {CURRENCIES.map(([code, label]) => (
            <option key={code} value={code}>
              {code} · {label}
            </option>
          ))}
        </select>
        <div className="mb-2 mt-4 text-[13px] font-bold text-muted-2">
          Presupuesto mensual <span className="font-medium text-muted">(opcional)</span>
        </div>
        <input
          name="monthly_budget"
          inputMode="decimal"
          defaultValue={monthlyBudget ? String(monthlyBudget) : ""}
          placeholder="Ej. 8000 — déjalo vacío para quitarlo"
          className={inputClass}
        />
        <button
          type="submit"
          className="mt-4 h-[50px] w-full rounded-[15px] bg-coral text-base font-extrabold text-white"
        >
          Guardar
        </button>
      </form>

      {/* Automatización */}
      <SectionLabel>Automatización del iPhone</SectionLabel>
      <div className="rounded-[24px] bg-white px-5 py-[18px]">
        {token ? (
          <>
            <div className="flex items-center gap-[9px] text-sm font-semibold">
              <span className="flex h-[22px] w-[22px] items-center justify-center rounded-[7px] bg-mint">
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#1E4435" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 7.5 5.5 11 12 3" />
                </svg>
              </span>
              Token iPhone activo
            </div>
            <div className="ml-[31px] mt-1.5 text-xs font-medium text-muted">
              {token.last_used_at
                ? `Usado por última vez el ${new Date(token.last_used_at).toLocaleDateString("es-MX")}`
                : "Aún sin usarse"}
            </div>
            <div className="mt-4 flex gap-2.5">
              <Link
                href="/ajustes/atajos"
                className="flex h-[46px] flex-1 items-center justify-center rounded-[14px] bg-ink text-sm font-bold text-white"
              >
                Ver instrucciones
              </Link>
              <form action={revokeToken} className="flex-1">
                <button
                  type="submit"
                  className="h-[46px] w-full rounded-[14px] border-[1.6px] border-[#E0A99C] text-sm font-bold text-coral-dark"
                >
                  Revocar
                </button>
              </form>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-muted-2">
              Conecta tu iPhone para que tus pagos con Apple Pay se registren solos.
            </p>
            <Link
              href="/ajustes/atajos"
              className="mt-4 flex h-[46px] items-center justify-center rounded-[14px] bg-coral text-sm font-bold text-white"
            >
              Configurar mi iPhone
            </Link>
          </>
        )}
      </div>

      {/* Categorías */}
      <SectionLabel>Categorías</SectionLabel>
      <div className="overflow-hidden rounded-[24px] bg-white">
        {(categories ?? []).map((c, i, arr) => (
          <div
            key={c.id}
            className={`flex items-center gap-[13px] px-[18px] py-3.5 ${
              i < arr.length - 1 ? "border-b border-crema" : ""
            }`}
          >
            <div
              className="flex h-[34px] w-[34px] items-center justify-center rounded-[11px]"
              style={{ background: categoryColor(c.name) }}
            >
              <CategoryIcon name={c.name} emoji={c.icon} color="#15140F" size={18} />
            </div>
            <div className="flex-1 text-[15px] font-bold">{c.name}</div>
            <form action={deleteCategory}>
              <input type="hidden" name="id" value={c.id} />
              <button type="submit" className="text-[13px] font-bold text-coral-dark">
                Eliminar
              </button>
            </form>
          </div>
        ))}
      </div>
      <form action={addCategory} className="mt-3 flex gap-2">
        <input
          name="icon"
          placeholder="🛍️"
          maxLength={4}
          className="w-16 rounded-[14px] border-[1.6px] border-input-border bg-input px-2 py-[13px] text-center outline-none focus:border-coral"
        />
        <input
          name="name"
          required
          placeholder="Nueva categoría"
          className="flex-1 rounded-[14px] border-[1.6px] border-input-border bg-input px-[15px] py-[13px] text-[15px] font-medium outline-none focus:border-coral"
        />
        <button type="submit" className="rounded-[14px] bg-ink px-4 text-sm font-bold text-white">
          Añadir
        </button>
      </form>
      <p className="mx-1 mt-2 text-xs font-medium text-muted">
        Al eliminar una categoría, sus gastos quedan como &quot;Sin categoría&quot;.
      </p>

      <form action={signOut} className="mt-6">
        <button
          type="submit"
          className="h-[50px] w-full rounded-[15px] border-[1.6px] border-input-border font-bold text-muted-2"
        >
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}
