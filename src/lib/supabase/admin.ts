import { createClient } from "@supabase/supabase-js";
import { serverEnv, publicEnv } from "@/lib/config/env";

// Secret-key client. Bypasses RLS — server-only, trusted contexts only.
export function createAdminClient() {
  const { NEXT_PUBLIC_SUPABASE_URL } = publicEnv();
  const { SUPABASE_SECRET_KEY } = serverEnv();
  return createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
