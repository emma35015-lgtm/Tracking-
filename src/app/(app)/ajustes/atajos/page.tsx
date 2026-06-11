import { createClient } from "@/lib/supabase/server";
import { ShortcutSetup } from "@/components/shortcut-setup";

export default async function AtajosPage() {
  const supabase = await createClient();
  const { data: token } = await supabase
    .from("api_tokens")
    .select("created_at")
    .maybeSingle();

  return (
    <div className="screen-in">
      <h1 className="mt-1.5 text-[26px] font-extrabold tracking-tight">Conecta tu iPhone</h1>
      <p className="mb-5 mt-1 text-sm font-medium text-muted">
        En unos minutos tus pagos con Apple Pay se registrarán solos, y podrás decir
        &quot;Oye Siri, registrar gasto&quot; para el efectivo.
      </p>
      <ShortcutSetup hasToken={Boolean(token)} />
    </div>
  );
}
