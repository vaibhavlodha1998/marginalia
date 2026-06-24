import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/config/env";

// Browser client. Anon key + RLS only.
export function createClient() {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } =
    publicEnv();
  return createBrowserClient(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
