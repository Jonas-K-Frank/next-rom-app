# Rumpriser

En dansk rum-prissammenligningsapp. Viser priser og prishistorik for rom fra
2-3 danske online forhandlere, så man nemt kan se hvor en flaske er billigst
lige nu og hvordan prisen har udviklet sig over tid.

v1 har ingen brugerkonti eller notifikationer — det er ren
prissammenligning.

## Tech stack

- [Next.js](https://nextjs.org) (App Router, TypeScript)
- [Supabase](https://supabase.com) (Postgres) som database
- [Tailwind CSS](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) som designsystem
- [Recharts](https://recharts.org) til prisgrafer
- Deploy på [Vercel](https://vercel.com)
- Priser hentes ind via [Apify](https://apify.com) actors, der kalder en webhook i appen

## Kør lokalt

### 1. Installer dependencies

```bash
npm install
```

### 2. Sæt Supabase-env-vars op

Kopiér `.env.example` til `.env.local` og udfyld værdierne fra dit
Supabase-projekt (**Project Settings → API**):

```bash
cp .env.example .env.local
```

| Variabel | Beskrivelse |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL'en på dit Supabase-projekt |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon-nøgle, sikker at eksponere til klienten |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role-nøgle, kun brugt server-side (fx i webhooken). Må aldrig eksponeres til klienten |
| `APIFY_WEBHOOK_SECRET` | Delt hemmelighed til at verificere at webhook-kald faktisk kommer fra Apify |

### 3. Kør migrationen

Kør SQL-filerne i [`supabase/migrations/`](supabase/migrations/) mod dit
Supabase-projekt, enten via Supabase CLI (`supabase db push`) eller ved at
lime dem ind i SQL Editor i Supabase-dashboardet, i rækkefølge.

### 4. Start dev-serveren

```bash
npm run dev
```

Åbn [http://localhost:3000](http://localhost:3000).

## Databaseskema

- `retailers` — de forhandlere vi sammenligner priser fra
- `products` — de faktiske rom-produkter (mærke, volumen, abv, kategori)
- `product_retailer_links` — kobler et produkt til en forhandlers side for det
- `prices` — **append-only** prishistorik: hver scraping indsætter en ny
  række i stedet for at opdatere en eksisterende, så vi får priskurver
  gratis. Der er sat `revoke update, delete` på tabellen for at håndhæve det.

To Postgres-views (`latest_prices`, `product_lowest_prices`) gør det billigt
at hente "prisen lige nu" uden at scanne hele historikken ved hvert opslag.

## Next steps

1. **Opret Supabase-projekt og kør migrationen** — se ovenfor.
2. **Byg Apify actors** til at scrape priser fra de valgte forhandlere.
3. **Implementér webhook-logik** i [`app/api/apify-webhook/route.ts`](app/api/apify-webhook/route.ts) —
   verificér requestet, hent scraping-resultatet, match det til
   `product_retailer_links`, og indsæt nye rækker i `prices`.
4. **Manuel produkt-matching** via Supabase Table Editor — opret rækker i
   `products` og `product_retailer_links` for at koble de rom I vil
   sammenligne til de forskellige forhandleres produktsider.
