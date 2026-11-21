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

## Manuelt: database-backup

Supabase CLI og `pg_dump` er ikke installeret her, så backup kan ikke bekræftes
automatisk. Tjek i Supabase Dashboard → Database → Backups. Er der ingen
automatiske backups på din plan, så tag et manuelt dump (Dashboard → Database →
Backups, eller `pg_dump` med forbindelsesstrengen) **før skridt 3**, som er det
første skridt der tilføjer en migration.
