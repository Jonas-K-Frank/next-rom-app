<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Datapipeline — vigtigt for alle agenter

- Priser føres **manuelt pr. butik** (curl/offentligt API) → genereret import-SQL i `scripts/import/<shop>_import.sql` → staging-tabel `stg_<shop>_dk` → `SELECT * FROM import_shop(...)` i Supabase SQL Editor. Der er **ingen Apify-webhook-pipeline**; `app/api/apify-webhook/route.ts` er en ubrugt stub fra en forladt plan.
- `import_shop`'s dedup vælger én række pr. produkt via `DISTINCT ON (normalize_name(navn), volumen) ... ORDER BY ..., url` — alfabetisk efter `url`, IKKE nyeste `scraped_at`. Kør derfor **altid `TRUNCATE stg_<shop>_dk;`** (eller hele import-filen, som starter med `CREATE TABLE IF NOT EXISTS … ; TRUNCATE …`) før hver ny import-runde, ellers kan gamle rækker vinde og give forældede priser.
- `supabase/migrations/` kan være bagud i forhold til den levende Supabase-database (fx `stg_*`, `import_shop`, normaliseringsfunktioner). Ændr ikke skema-antagelser ud fra migrationsfilerne alene — tjek den levende database eller et friskt `pg_dump`-schema.
- `prices` er append-only (`revoke update, delete`); `prices.in_stock` er NOT NULL — “ukendt” lagerstatus skal vælges TRUE/FALSE, aldrig NULL.
- Import-SQL-filer pr. butik hører hjemme i `scripts/import/` — behold dem i repoet som backup af databasens oprindelse.
