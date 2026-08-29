import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

// Supabase-klient til brug i Client Components. v1 henter al data via Server
// Components, så denne bruges ikke endnu, men er klar til fx interaktive
// filtre eller realtime-features senere.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
