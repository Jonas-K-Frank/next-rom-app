import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "./database.types";

// Supabase-klient til brug i Server Components, Server Actions og Route
// Handlers. Opret en ny instans pr. request (kald funktionen igen) i stedet
// for at genbruge én global klient, da den er bundet til requestets cookies.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll kaldt fra en Server Component uden mulighed for at
            // skrive cookies. Kan ignoreres når man har middleware der
            // opdaterer sessionen, hvilket ikke er relevant i v1 (ingen auth).
          }
        },
      },
    },
  );
}
