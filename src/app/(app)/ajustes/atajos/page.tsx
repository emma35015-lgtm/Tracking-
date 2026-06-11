import { createClient } from "@/lib/supabase/server";
import { ShortcutSetup } from "@/components/shortcut-setup";

export default async function AtajosPage() {
  const supabase = await createClient();
  const { data: token } = await supabase
    .from("api_tokens")
    .select("created_at")
    .maybeSingle();

  return (
    <div>
      <h1 className="mb-1 text-lg font-bold">Conecta tu iPhone</h1>
      <p className="mb-5 text-sm text-zinc-500">
        En unos 2 minutos tus pagos con Apple Pay se registrarán solos, y podrás
        decir &quot;Oye Siri, registrar gasto&quot; para el efectivo.
      </p>
      <ShortcutSetup hasToken={Boolean(token)} />
    </div>
  );
}
