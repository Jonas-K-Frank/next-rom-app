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
| 0   | Sikkerhedsnet og baseline       | Ingen  | Baseline gemt, `npm run verify` kører           | [~] backup mangler |
| 1   | Hygiejne (git, docs)            | Ingen  | `verify` giver samme resultat som baseline      | [ ]    |
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
- [ ] Bekræft Supabase-backup (eller `pg_dump`). **Kræver manuel handling fra Jonas**,
      se `baseline/README.md`. Skal være på plads før skridt 3
- [x] `npm run verify` (tsc + ESLint-ikke-værre-end-baseline + build). Selvtestet: fejler
      korrekt på bevidst indsat typefejl og ny `any`

Færdig når: der findes en `baseline/`-mappe med "sådan så det ud før", og `verify` kører.

**Fund fra baseline** (detaljer i `baseline/README.md`):

- Skridt 2-hypotesen er bekræftet på build-niveau: `/` og `/produkt/[id]` er `ƒ`
- Skridt 3a er bekræftet: 2891 rækker i `product_lowest_prices`, kun 1000 hentes til Månedens fund
- Der er næsten ingen prishistorik (3289 priser / 3287 links, 2 rækker i `product_price_drops`),
  så Månedens fund er altid fallback-grenen, og prisgrafen vises næsten aldrig. Ingen fejl,
  men det betyder at 3a ikke kan ses på forsiden endnu; den skal bevises med snapshot

## Skridt 1: Hygiejne

- [ ] `*.log` og `supabase/.temp/` i `.gitignore`, `git rm --cached` på committede logs
- [ ] Ret README og `scripts/README.md` (forhandlerantal, webhook-status, forkert filnavn)
- [ ] `MISTRAL_API_KEY` i `.env.example`

Verificér: `npm run verify` giver samme resultat som baseline.

## Skridt 2: Få cachen til at virke

- [ ] Mål først: `next build && next start`, to gange `curl -I /` og se `x-nextjs-cache`.
      Hvis det allerede er HIT, er hypotesen afkræftet og skridtet er færdigt
- [ ] Cookie-løs Supabase-klient til offentlig læsning i `lib/data/products.ts`
- [ ] Verificér: `○`/`●` i build-output, HIT ved andet kald, forside-HTML uændret ift. baseline

## Skridt 3: Datalaget

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

- Webhook: bygges nu eller fjernes? (skridt 4)
- Billedhåndtering: begræns domæner, eller kopiér billeder til Supabase Storage?
