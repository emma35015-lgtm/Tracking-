import { createClient } from "@/lib/supabase/server";
import { SplitFlow } from "@/components/split/split-flow";
import { InfoButton } from "@/components/info-button";

export default async function DividirPage() {
  const supabase = await createClient();
  const [{ data: categories }, { data: profile }] = await Promise.all([
    supabase.from("categories").select("id, name, icon, color").order("name"),
    supabase.from("profiles").select("default_currency").maybeSingle(),
  ]);

  const cats = categories ?? [];
  const defaultCategoryId = cats.find((c) => c.name === "Comida")?.id ?? "";

  return (
    <div className="screen-in px-1 pt-2">
      <div className="flex items-center gap-2">
        <h1 className="text-[34px] font-extrabold leading-[0.95] tracking-[-0.03em]">Dividir cuenta</h1>
        <InfoButton
          title="Dividir cuenta"
          text="Tómale foto al ticket (o escríbelo), marca lo que pediste tú y la app calcula cuánto te toca pagar, incluida la propina. Puedes guardarlo como gasto."
        />
      </div>
      <p className="mt-2 text-sm font-medium text-muted">
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
