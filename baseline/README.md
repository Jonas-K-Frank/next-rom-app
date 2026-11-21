# Baseline (skridt 0)

Taget 2026-11-21 på commit `257d85c` (git-tag `pre-cleanup`), før nogen ændringer.
Sammenlign mod disse filer efter hvert skridt i `PLAN.md`.

| Fil                    | Indhold                                                                 |
| ---------------------- | ----------------------------------------------------------------------- |
| `tsc.txt`              | `tsc --noEmit`: ren (exit 0)                                            |
| `eslint.json`          | Fuldt ESLint-output (JSON)                                              |
| `eslint-summary.json`  | 6 errors, 5 warnings. `npm run verify` fejler hvis det bliver værre     |
| `build.txt`            | `next build`: lykkes, ruteliste nedenfor                                |
| `db-snapshot.json`     | Nøgletal fra databasen (kun læsning, anon-nøgle)                        |

Gentag snapshot efter et skridt: `npm run snapshot:baseline -- --out=efter-skridt-3`
og sammenlign med `diff baseline/db-snapshot.json baseline/efter-skridt-3.json`
(ignorer `takenAt`).

## Ruteliste (build)

```
┌ ƒ /                     ← dynamisk, ISR (revalidate=3600) virker IKKE
├ ○ /_not-found
├ ƒ /api/apify-webhook
└ ƒ /produkt/[id]         ← dynamisk, ISR virker IKKE
```

## Hvad baseline allerede har afsløret

1. **ISR virker ikke** (skridt 2): `/` og `/produkt/[id]` er `ƒ` trods `revalidate = 3600`.
2. **Månedens fund er bygget på afkortede data** (skridt 3a):
   `product_lowest_prices` har 2891 rækker, men queryen i `getMonthlyFind`
   returnerer kun 1000. Valget sker altså ud fra ca. 1/3 af kataloget.
3. **Der findes reelt ingen prishistorik endnu**: 3289 prisrækker for 3287 links,
   og `product_price_drops` har 2 rækker (ingen med et faktisk fald). Derfor vælger
   "Månedens fund" altid fallback-grenen ("flest forhandlere"), og
   "Prisudvikling"-grafen vises næsten aldrig.
4. **ESLint har 6 errors, ikke 2**: 4 i `lib/data/products.ts` (`any`, `prefer-const`)
   og 2 i `HomeClient.tsx`. De 4 første forsvinder naturligt i skridt 3.

## Database-backup (Supabase-planen har ingen automatiske backups)

**Trin A: data-backup via API (gjort, 2026-11-21).** `npm run backup:data` henter
`retailers`, `products`, `product_retailer_links` og `prices` til `backups/<tid>/*.json`
(gitignored) med manifest og sha256. Rækketal matcher `db-snapshot.json` præcist
(10 / 3120 / 3287 / 3289). Det er kun data. Ingen skema, funktioner eller policies.

**Trin B: komplet pg_dump (gjort 2026-11-21 14:33).** Se `baseline/pg-dump-manifest.txt` for rækketal
og checksums. Skemaet ligger i git som `supabase/schema-snapshot.sql`.
Bekræft kopien på den anden disk med `shasum -a 256 <sti>/full.dump` og sammenlign.

API'et kunne ikke se: 10 `stg_*`-tabeller (permission denied selv for `service_role`), RPC-funktionerne
`import_shop`, `normalize_name`, `normalize_name_v2`, `decode_entities` og `extract_numbers`, kolonnen
`products.normalized_name`, `product_retailer_links.description` og extension `pg_trgm`. De er nu
dokumenteret i schema-snapshot.sql, men findes stadig ikke i `supabase/migrations/`.

Gentag `npm run backup:pg` før hver ny migration (skridt 3 og 4).
