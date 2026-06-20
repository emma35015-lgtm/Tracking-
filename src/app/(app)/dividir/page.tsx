import { createClient } from "@/lib/supabase/server";
import { SplitFlow } from "@/components/split/split-flow";

export default async function DividirPage() {
  const supabase = await createClient();
  const [{ data: categories }, { data: profile }] = await Promise.all([
    supabase.from("categories").select("id, name, icon, color").order("name"),
    supabase.from("profiles").select("default_currency").maybeSingle(),
  ]);

  const cats = categories ?? [];
  const defaultCategoryId = cats.find((c) => c.name === "Comida")?.id ?? "";

  return (
    <div className="screen-in">
      <h1 className="mt-1.5 text-[26px] font-extrabold tracking-tight">Dividir cuenta</h1>
      <p className="mt-1 text-sm font-medium text-muted">
        Foto del ticket, marca lo tuyo y calculamos cuánto te toca.
      </p>
      <SplitFlow
        categories={cats}
        currency={profile?.default_currency ?? "MXN"}
        defaultCategoryId={defaultCategoryId}
      />
    </div>
  );
}
