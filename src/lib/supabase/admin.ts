import { createClient } from "@supabase/supabase-js";

// Cliente con service-role key: ignora RLS. Solo para /api/ingest,
// después de validar el token del usuario. Nunca importar desde el cliente.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
