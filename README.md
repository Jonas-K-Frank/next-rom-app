# Rumpriser

En dansk rum-prissammenligningsapp. Viser rom fra 10 danske online forhandlere
(november 2026: ca. 3100 produkter, heraf ca. 2900 med en pris på lager), så man
nemt kan se, hvor en flaske er billigst lige nu.

v1 har ingen brugerkonti eller notifikationer. Det er ren prissammenligning.
Prishistorikken er indtil videre kort (i praksis ét scrape pr. link), så
prisgrafen vises kun for få produkter.

## Tech stack

- [Next.js](https://nextjs.org) 16 (App Router, TypeScript, React 19)
- [Supabase](https://supabase.com) (Postgres) som database
- [Tailwind CSS](https://tailwindcss.com) 4 + [shadcn/ui](https://ui.shadcn.com) som designsystem
- [Recharts](https://recharts.org) til prisgrafer
- Deploy på [Vercel](https://vercel.com)
- [Mistral](https://mistral.ai) bruges offline i `scripts/` til produktbeskrivelser og oprindelsesland

## Datapipeline

Priser kommer ikke ind via appen. Flowet er:

```
scraping (uden for dette repo)  ->  stg_<butik>-tabeller i Supabase
                                ->  public.import_shop(navn, base_url, stg_tabel)
                                ->  retailers / products / product_retailer_links / prices
```

- `import_shop` normaliserer navne (`normalize_name`, `decode_entities`), opretter
  produkter og links og **tilføjer** en ny pris, hvis `(link_id, scraped_at)` er ny.
- `stg_*`-tabellerne og funktionerne findes kun i databasen, ikke i
  `supabase/migrations/`. Det fulde skema ligger i
  [`supabase/schema-snapshot.sql`](supabase/schema-snapshot.sql).
- **Mangler at blive dokumenteret:** hvordan `stg_*` fyldes, og hvordan/hvornår
  `import_shop` køres.
- `app/api/apify-webhook/route.ts` er en ubrugt stub, som kun logger. Den er ikke
  en del af pipelinen og bliver fjernet eller sikret (se `PLAN.md`, skridt 4).

## Kør lokalt

### 1. Installer dependencies

```bash
npm install
```

### 2. Sæt env-vars op

```bash
cp .env.example .env.local
```

Udfyld værdierne fra Supabase (**Project Settings → API**). Skriv værdien lige efter
`=` uden mellemrum.

| Variabel | Bruges af | Beskrivelse |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | appen og scripts | URL'en på dit Supabase-projekt |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | appen og scripts | Public anon-nøgle, sikker at eksponere til klienten |
| `SUPABASE_SERVICE_ROLE_KEY` | kun scripts | Omgår RLS. Må aldrig eksponeres til klienten |
| `MISTRAL_API_KEY` | kun scripts | `generate:descriptions` og `generate:countries` |
| `APIFY_WEBHOOK_SECRET` | ingen i dag | Hører til den ubrugte webhook-stub |

### 3. Database

Databasen findes allerede i Supabase. `supabase/migrations/` er **ufuldstændig** og
dækker ikke `stg_*`-tabeller, funktioner, `normalized_name` og flere indeks. Brug
[`supabase/schema-snapshot.sql`](supabase/schema-snapshot.sql) som den sande
beskrivelse. (At genskabe en tom database ud fra den er ikke afprøvet.)

### 4. Start dev-serveren

```bash
npm run dev
```

Åbn [http://localhost:3000](http://localhost:3000).

## Kommandoer

| Kommando | Hvad den gør |
| --- | --- |
| `npm run verify` | `tsc` + ESLint (må ikke blive værre end `baseline/`) + `next build`. Tilføj `-- --skip-build` for hurtig kørsel |
| `npm run snapshot:baseline` | Skrivebeskyttet snapshot af nøgletal fra databasen til `baseline/` |
| `npm run backup:data` | JSON-backup af kernetabellerne via API'et til `backups/` (gitignored) |
| `npm run backup:pg` | Komplet `pg_dump` (kræver `DATABASE_URL` sat i din terminal og `brew install libpq`) |
| `npm run generate:descriptions` | Genererer produktbeskrivelser med Mistral, se [`scripts/README.md`](scripts/README.md) |
| `npm run generate:countries` | Udleder oprindelsesland med Mistral |
| `npm run check:db` | Tjekker at databasen har de kolonner, beskrivelsesscriptet forventer |

**Supabase-planen har ingen automatiske backups.** Tag `npm run backup:pg` før
enhver ændring i databasen, og kopiér dumpet til en anden disk.

## Databaseskema (kort)

- `retailers`: forhandlerne
- `products`: rom-produkter (navn, brand, volumen, abv, kategori, land, beskrivelse, `image_url`)
- `product_retailer_links`: ét produkt hos én forhandler (unik på `product_id + retailer_id` og på `product_url`)
- `prices`: prishistorik, tiltænkt som append-only. I dag håndhæves det **kun** af RLS
  (der er ingen skrive-policies). Migrationens `revoke update, delete` er ikke længere
  gældende. Rettes i `PLAN.md`, skridt 4
- Views: `latest_prices`, `product_lowest_prices`, `product_price_drops`, `catalog_stats`

## Oprydning og plan

Der pågår en trinvis oprydning på branchen `cleanup`. Se [`PLAN.md`](PLAN.md) for
skridtene og [`baseline/README.md`](baseline/README.md) for målingerne før ændringerne.
