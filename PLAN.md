# PLAN: oprydning og forbedring af Rompriser

Princip: **ét skridt ad gangen, og et skridt er først færdigt, når det er målt.**
Hvert skridt er sin egen commit (eller små commits), så vi altid kan finde og
rulle tilbage til det, der gik galt.

## Spilleregler

- Vi arbejder på branchen `cleanup`. `main` rører vi først, når et skridt er
  verificeret på et Vercel preview-deploy.
- Databaseændringer er **additive**: nye views oprettes ved siden af de gamle.
  De gamle slettes først, når de nye er bevist ens.
- Hvis et skridt skal være usynligt for brugeren, beviser vi det med tal.
- Intet skridt bygger på et uverificeret skridt.
- Hver commit ændrer kun én ting (så `git bisect` virker).

## Overblik

| #   | Skridt                          | Risiko | Bevis for at det virker                         | Status |
| --- | ------------------------------- | ------ | ----------------------------------------------- | ------ |
| 0   | Sikkerhedsnet og baseline       | Ingen  | Baseline gemt, `npm run verify` kører           | [x] |
| 1   | Hygiejne (git, docs)            | Ingen  | `verify` giver samme resultat som baseline      | [x]    |
| 2   | Ret ISR/cache                   | Lav    | Build-output (`○`/`●`) og `x-nextjs-cache: HIT` | [ ]    |
| 3   | Datalag og 1000-rækkers-fejl    | Mellem | Gammel og ny query returnerer identiske data    | [ ]    |
| 4   | Sikkerhed: billedproxy, webhook | Mellem | Alle billeder loader, webhook giver 401         | [ ]    |
| 5   | SEO                             | Lav    | Metadata i view-source, gyldig JSON-LD          | [ ]    |
| 6   | Frontend-oprydning              | Mellem | Visuel sammenligning, lint uden errors          | [ ]    |
| 7   | Robusthed: fejlsider, tests, CI | Lav    | CI grøn                                         | [ ]    |

---

## Skridt 0: Sikkerhedsnet (ingen ændringer i app-kode)

- [x] Branch `cleanup` + git-tag `pre-cleanup` (commit `257d85c`)
- [x] Baseline fra `next build`: ruteliste og build-tid (`baseline/build.txt`).
      Turbopack udskriver ikke bundle-størrelser, så de er ikke med
- [x] Baseline af `tsc` (ren) og ESLint (**6 errors, 5 warnings**, ikke 2 som først antaget)
- [x] Snapshot af nøgletal fra databasen (`baseline/db-snapshot.json`)
- [x] Data-backup via API (`npm run backup:data` -> `backups/`, gitignored): de 4 kernetabeller,
      rækketal bekræftet mod baseline. Supabase-planen har ingen automatiske backups
- [x] **Komplet pg_dump** taget 2026-11-21 14:33 (`full.dump` + `schema.sql`): alle 14 tabeller,
      5 funktioner, policies og grants. Rækketal verificeret (se `baseline/pg-dump-manifest.txt`)
- [x] Skema-dump i git som `supabase/schema-snapshot.sql` (migrationerne er ude af trit med databasen)
- [x] Dump kopieret til anden disk (rapporteret af Jonas). TODO: bekræft med
      `shasum -a 256` mod `baseline/pg-dump-manifest.txt`
- [x] `npm run verify` (tsc + ESLint-ikke-værre-end-baseline + build). Selvtestet: fejler
      korrekt på bevidst indsat typefejl og ny `any`

Færdig når: der findes en `baseline/`-mappe med "sådan så det ud før", og `verify` kører.

**Fund fra baseline** (detaljer i `baseline/README.md`):

- **Sådan er datapipelinen faktisk:** `stg_<butik>` -> `import_shop(navn, base_url, stg_tabel)`
  -> `retailers`/`products`/`product_retailer_links`/`prices`. Priser appendes kun hvis
  `(link_id, scraped_at)` er ny. Webhook-ruten i appen indgår ikke i den kæde (den logger kun).
  Ukendt: hvordan `stg_*` fyldes, og hvem/hvad kalder `import_shop` (formentlig manuelt i SQL editor)
- Rettigheder: `anon`/`authenticated` har `GRANT ALL` på `products`, `prices`, `retailers`,
  `product_retailer_links`. Kun RLS (ingen skrive-policies) forhindrer skrivning. Migrationens
  `revoke update, delete on prices` er ikke længere gældende. Alle funktioner (inkl. `import_shop`)
  har `EXECUTE` til `anon`. `stg_whisky_dk` har ikke RLS slået til (de 9 andre har)
- Skridt 2-hypotesen er bekræftet på build-niveau: `/` og `/produkt/[id]` er `ƒ`
- Databasen indeholder logik, der ikke findes i repoet: 10 `stg_*`-tabeller (utilgængelige via
  API, selv for service_role), funktioner (`import_shop`, `normalize_name(_v2)`,
  `decode_entities`, `extract_numbers`), `normalized_name`-kolonnen og `pg_trgm`. Derfor
  kræver skridt 3 en komplet pg_dump først, og vi rører ikke disse objekter
- Skridt 3a er bekræftet: 2891 rækker i `product_lowest_prices`, kun 1000 hentes til Månedens fund
- Der er næsten ingen prishistorik (3289 priser / 3287 links, 2 rækker i `product_price_drops`),
  så Månedens fund er altid fallback-grenen, og prisgrafen vises næsten aldrig. Ingen fejl,
  men det betyder at 3a ikke kan ses på forsiden endnu; den skal bevises med snapshot

## Skridt 1: Hygiejne (færdigt)

- [x] `*.log`, `scripts/generation_report.txt` og `supabase/.temp/` i `.gitignore`; 10 filer fjernet
      fra git (de ligger stadig på disken). Scannet for hemmeligheder i filerne og historikken: intet fundet
- [x] README omskrevet: faktisk pipeline (`stg_*` -> `import_shop`), 10 forhandlere, kommandoer,
      env-tabel, advarsel om manglende backups, skema-snapshot som kilde. `scripts/README.md`: forkert
      filnavn rettet og øvrige scripts tilføjet
- [x] `.env.example`: `MISTRAL_API_KEY` tilføjet, deles op i "appen" / "kun scripts" / "ikke i brug"
- [x] Verificeret: `npm run verify` identisk med baseline (6 errors / 5 warnings, samme ruteliste),
      ingen filer i `app/`, `components/`, `lib/`, `public/` eller config rørt

Udestår fra README (kræver Jonas): hvordan `stg_*` fyldes og hvornår `import_shop` køres.

## Skridt 2: Få cachen til at virke

- [ ] Mål først: `next build && next start`, to gange `curl -I /` og se `x-nextjs-cache`.
      Hvis det allerede er HIT, er hypotesen afkræftet og skridtet er færdigt
- [ ] Cookie-løs Supabase-klient til offentlig læsning i `lib/data/products.ts`
- [ ] Verificér: `○`/`●` i build-output, HIT ved andet kald, forside-HTML uændret ift. baseline

## Skridt 3: Datalaget

**Forudsætning:** komplet pg_dump taget og kopieret (skridt 0): opfyldt. Rør ikke `stg_*`, `import_shop`
og `normalize_name*`; de er ikke en del af dette skridt.

- [ ] 3a: `getMonthlyFind` paginerer (loft på 1000 rækker). Sammenlign valgt produkt før/efter
- [ ] 3b: Ny migration med `product_list_view` (join i databasen, kun nødvendige kolonner).
      Gammelt view og gammel kode urørt
- [ ] 3c: Midlertidigt diff-script (gammel vs. ny: antal, id'er, laveste pris).
      Først når diff er tom, skifter forsiden. Derefter fjernes gammel kode

Rollback: skift tilbage til den gamle funktion (findes indtil 3c er bevist).

## Skridt 4: Sikkerhed

- [ ] Find faktiske billeddomæner (`select distinct` på værtsnavne i `products.image_url`),
      begræns `images.remotePatterns`, gå alle sider igennem for brudte billeder
- [ ] Webhook: 401 uden gyldigt `APIFY_WEBHOOK_SECRET` (eller fjern ruten). Test med `curl`
- [ ] Træk skrive-rettigheder tilbage (ny migration): `revoke insert, update, delete, truncate
      on products, prices, retailers, product_retailer_links from anon, authenticated` og
      `revoke execute on function import_shop(...) from anon, authenticated, public`.
      Test først at forsiden, PDP og scrape/import-flowet stadig virker
- [ ] `alter table stg_whisky_dk enable row level security` (som de 9 andre)

## Skridt 5: SEO

- [ ] `generateMetadata` på produktsiden
- [ ] `sitemap.ts` og `robots.ts`
- [ ] JSON-LD (Product/AggregateOffer)
- [ ] Verificér i view-source og Rich Results Test, sitemap har rigtigt antal URL'er

## Skridt 6: Frontend-oprydning (én ting pr. commit, før/efter-screenshots)

- [ ] DM Serif Display via `next/font`
- [ ] Hero-billeder via `next/image`
- [ ] Fjern pinch-zoom-blokering (`maximumScale`/`userScalable`)
- [ ] Faste forhandlerfarver i prisgrafen
- [ ] Ét accent-token i stedet for hårdkodet `#c2410c`
- [ ] `HomeClient`: scroll-/tilstandsgendannelse. Testmatrix: søg, vis flere, klik ind,
      tilbage, genindlæs, direkte link

## Skridt 7: Robusthed

- [ ] `error.tsx`, `not-found.tsx`, `loading.tsx`
- [ ] Enhedstests: `cleanDisplayName`, pris-funktioner
- [ ] GitHub Action der kører `verify`

---

## Hvis noget går i stykker

1. Stop. Lav ikke flere ændringer.
2. `git bisect` mellem `pre-cleanup` og HEAD finder den skyldige commit.
3. Rul den commit tilbage og find årsagen, før vi prøver igen.

## Åbne beslutninger

- Webhook: bygges nu eller fjernes? (skridt 4). Anbefaling: fjern den, da pipelinen går via `stg_*` + `import_shop`
- Billedhåndtering: begræns domæner, eller kopiér billeder til Supabase Storage?
