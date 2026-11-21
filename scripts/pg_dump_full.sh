#!/usr/bin/env bash
# pg_dump_full.sh: komplet backup af Supabase-databasen (data + skema + funktioner + policies).
#
# Supabase-planen har ingen automatiske backups, og stg_*-tabellerne samt
# funktionerne (import_shop m.fl.) kan ikke tages via API'et. Det kræver en
# direkte Postgres-forbindelse.
#
# Forudsætninger:
#   brew install libpq           (giver pg_dump og psql)
#   export DATABASE_URL='postgresql://postgres.<ref>:<DB-PASSWORD>@<host>:5432/postgres'
#       Supabase Dashboard -> Connect -> "Session pooler" (virker over IPv4).
#       Sæt variablen i din terminal. Kopiér den ALDRIG ind i en chat eller en fil i git.
#
# Kørsel:  bash scripts/pg_dump_full.sh
#
# Output (backups/ er gitignored, undtagen schema-snapshot som du selv kopierer til git):
#   backups/pg-<tidsstempel>/full.dump      pg_restore-format (data + skema, schema public)
#   backups/pg-<tidsstempel>/schema.sql     læsbart skema: tabeller, views, funktioner, policies, grants
#   backups/pg-<tidsstempel>/extensions.txt installerede extensions (fx pg_trgm)
#   backups/pg-<tidsstempel>/cron.txt       pg_cron-jobs, hvis cron-skemaet findes
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Mangler DATABASE_URL. Se kommentarerne øverst i scriptet." >&2
  exit 1
fi

find_bin() {
  command -v "$1" 2>/dev/null || { [[ -x "/opt/homebrew/opt/libpq/bin/$1" ]] && echo "/opt/homebrew/opt/libpq/bin/$1"; } || true
}
PG_DUMP="$(find_bin pg_dump)"
PSQL="$(find_bin psql)"
if [[ -z "$PG_DUMP" || -z "$PSQL" ]]; then
  echo "pg_dump/psql ikke fundet. Kør: brew install libpq" >&2
  exit 1
fi

cd "$(dirname "$0")/.."
DIR="backups/pg-$(date +%Y-%m-%dT%H-%M-%S)"
mkdir -p "$DIR"
echo "Skriver til $DIR (server: $("$PSQL" "$DATABASE_URL" -Atc 'show server_version'))"

echo "-> full.dump (data + skema, schema public)"
"$PG_DUMP" "$DATABASE_URL" --schema=public --no-owner -Fc -f "$DIR/full.dump"

echo "-> schema.sql (kun skema, læsbart)"
"$PG_DUMP" "$DATABASE_URL" --schema=public --schema-only --no-owner -f "$DIR/schema.sql"

echo "-> extensions.txt"
"$PSQL" "$DATABASE_URL" -Atc "select extname || ' ' || extversion from pg_extension order by 1" > "$DIR/extensions.txt"

echo "-> cron.txt (ignoreres hvis pg_cron ikke er slået til)"
"$PSQL" "$DATABASE_URL" -Atc "select jobname || ' | ' || schedule || ' | ' || command from cron.job" > "$DIR/cron.txt" 2>/dev/null || echo "(ingen cron-jobs / ikke aktiveret)" > "$DIR/cron.txt"

echo "-> verificerer at dumpet kan læses"
ENTRIES="$("$(dirname "$PG_DUMP")/pg_restore" --list "$DIR/full.dump" | grep -c 'TABLE DATA' || true)"
echo "   full.dump indeholder data for $ENTRIES tabeller"
FUNCS="$(grep -c '^CREATE FUNCTION' "$DIR/schema.sql" || true)"
echo "   schema.sql indeholder $FUNCS funktioner"

ls -la "$DIR"
echo
echo "Færdig. Næste: kopiér backups/pg-*/ til et ANDET sted end denne disk,"
echo "og læg schema.sql i git som supabase/schema-snapshot.sql (se PLAN.md, skridt 0)."
