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

Priser kommer ikke ind via appen eller et automatisk script. Der er ingen
Apify-til-Supabase-pipeline; flowet er manuelt og kører butik for butik:

```
1. scraping pr. butik (curl m.m., butiksspecifikt)
2. normalisering  ->  én import-SQL-fil pr. butik (INSERT ind i stg_<butik>_dk)
3. SQL-filen køres i Supabase SQL Editor
4. SELECT * FROM import_shop(navn, base_url, stg_tabel, kategori);
5. kontrolquery (antal, på lager, uden volumen/ABV ...) sidst i import-filen
```

Scraping-metoden varierer pr. butik, fx `data-product-*`-attributter (Juuls),
Algolia-API med offentlig søgenøgle (Føtex), sitemap-feeds (Vin Med Mere) og curl med
Anubis proof-of-work løst i Python (Uhrskov).

- Staging-tabellerne har 9 kolonner: `name, url, price_dkk, in_stock, volume_cl, abv,
  image_url, description, scraped_at` (`stg_whisky_dk` har desuden ekstra kolonner).
- `import_shop` normaliserer navne (`normalize_name`, `decode_entities`), opretter
  produkter og links og **tilføjer** en ny pris, hvis `(link_id, scraped_at)` er ny.
  Det er kun sikkert at genkøre, når `scraped_at` er den samme som sidst. En ny
  scraping med frisk `scraped_at` giver en ny prisrække pr. link. Det er meningen.
- Butikkerne, som de står i `retailers`. **Brug præcis disse `base_url`-værdier**, ellers
  opretter `import_shop` en ny forhandler i stedet for at genbruge den eksisterende:

  | Staging-tabel | `retailers.name` | `retailers.base_url` |
  | --- | --- | --- |
  | `stg_foetex_dk` | Foetex | `https://www.foetex.dk` |
  | `stg_hjhansen_vin_dk` | HJ Hansen Vin | `https://www.hjhansen-vin.dk` |
  | `stg_juuls_dk` | Juuls Vine | `https://www.juuls.dk` |
  | `stg_kokkensvinhus_dk` | Kokkens Vinhus | `https://www.kokkensvinhus.dk` |
  | `stg_rombo_dk` | Rombo.dk | `https://rombo.dk` |
  | `stg_spitus_dk` | Spitus.dk | `https://spitus.dk` |
  | `stg_uhrskov_dk` | Uhrskov Vine | `https://www.uhrskov-vine.dk` |
  | `stg_vinmedmere_dk` | Vin Med Mere | `https://vinmedmere.dk` |
  | `stg_whisky_dk` | Whisky.dk | `https://www.whisky.dk` |
  | `stg_whiskyeksperten_dk` | Whiskyeksperten | `https://www.whiskyeksperten.dk` |

  (Koblingen mellem tabel og butik er udledt af navnene.)
- **Rytme:** månedligt gen-scrape, næste runde ca. **2026-12-08**. Genkør scraping pr.
  butik, generér nye import-filer med frisk `scraped_at`, kør `import_shop`
  (historikken i `prices` bevares), og afslut med fusionskontrol (v2-nøgle + `pg_trgm`).
- Import-SQL-filerne (`juuls_import.sql` osv.) ligger **ikke** i dette repo.
- `stg_*`-tabellerne og funktionerne findes kun i databasen, ikke i
  `supabase/migrations/`. Det fulde skema ligger i
  [`supabase/schema-snapshot.sql`](supabase/schema-snapshot.sql).
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
