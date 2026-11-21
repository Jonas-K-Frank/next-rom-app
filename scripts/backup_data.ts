/**
 * backup_data.ts
 * Skrivebeskyttet backup af ALLE tabeller i Supabase til lokale JSON-filer
 * (Supabase-planen har ingen automatiske backups).
 *
 * Skriver til backups/<tidsstempel>/:
 *   <tabel>.json     rækkerne (array)
 *   openapi.json     PostgREST's skemabeskrivelse (tabeller, kolonner, typer)
 *   manifest.json    antal rækker (hentet vs. eksakt tælling) + sha256 pr. fil
 *
 * Bruger SUPABASE_SERVICE_ROLE_KEY hvis den findes (stg_*-tabellerne er
 * måske ikke læsbare for anon), ellers anon-nøglen. Der udføres KUN læsning.
 * Nøglen printes aldrig.
 *
 * Kørsel:  npm run backup:data
 *
 * Dette er en DATA-backup. Den indeholder ikke funktioner, triggers, RLS-policies,
 * indeks eller constraints. Dem tager du med pg_dump --schema-only (se
 * baseline/README.md).
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

config({ path: path.join(__dirname, "..", ".env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const key = serviceKey || anonKey;
if (!url || !key) {
  console.error("Mangler NEXT_PUBLIC_SUPABASE_URL og en nøgle i .env.local");
  process.exit(1);
}
const role = serviceKey ? "service_role" : "anon";
const supabase = createClient(url, key, { auth: { persistSession: false } });

// Tabeller og en deterministisk sortering (unik først), så paginering ikke
// springer rækker over eller dublerer.
// `optional`: stg_*-tabellerne har revokeret rettigheder for alle API-roller
// (selv service_role får 'permission denied'). De kan kun tages med pg_dump
// som postgres-rollen. Scriptet springer dem over og siger det tydeligt, i
// stedet for at ændre rettigheder i databasen.
const TABLES: { name: string; order: string[]; optional?: boolean }[] = [
  { name: "retailers", order: ["id"] },
  { name: "products", order: ["id"] },
  { name: "product_retailer_links", order: ["id"] },
  { name: "prices", order: ["id"] },
  ...[
    "stg_foetex_dk",
    "stg_hjhansen_vin_dk",
    "stg_juuls_dk",
    "stg_kokkensvinhus_dk",
    "stg_rombo_dk",
    "stg_spitus_dk",
    "stg_uhrskov_dk",
    "stg_vinmedmere_dk",
    "stg_whisky_dk",
    "stg_whiskyeksperten_dk",
  ].map((name) => ({ name, order: ["url", "scraped_at", "name"], optional: true })),
];

class PermissionDenied extends Error {}

const PAGE = 1000;

async function dumpTable(name: string, order: string[]) {
  const { count, error: countErr, status } = await supabase.from(name).select("*", { count: "exact", head: true });
  if (countErr) {
    if (status === 401 || status === 403) throw new PermissionDenied(`HTTP ${status} permission denied`);
    throw new Error(`${name}: tælling fejlede: ${countErr.message || `HTTP ${status}`}`);
  }

  const rows: unknown[] = [];
  let from = 0;
  while (true) {
    let q = supabase.from(name).select("*");
    for (const col of order) q = q.order(col, { ascending: true });
    const { data, error } = await q.range(from, from + PAGE - 1);
    if (error) throw new Error(`${name}: hentning fejlede: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
    from += PAGE;
  }
  return { rows, exactCount: count ?? 0 };
}

async function main() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = path.join(__dirname, "..", "backups", stamp);
  fs.mkdirSync(dir, { recursive: true });
  console.log(`Backup som ${role} -> ${path.relative(process.cwd(), dir)}\n`);

  const manifest: Record<string, unknown> = {
    takenAt: new Date().toISOString(),
    role,
    kind: "data-only (JSON). Ikke skema, funktioner, triggers eller policies",
    tables: {} as Record<string, unknown>,
  };
  let ok = true;
  const skipped: string[] = [];

  for (const t of TABLES) {
    try {
      const { rows, exactCount } = await dumpTable(t.name, t.order);
      const body = JSON.stringify(rows);
      const file = `${t.name}.json`;
      fs.writeFileSync(path.join(dir, file), body);
      const match = rows.length === exactCount;
      if (!match) ok = false;
      (manifest.tables as Record<string, unknown>)[t.name] = {
        file,
        rowsFetched: rows.length,
        rowsExact: exactCount,
        countMatches: match,
        bytes: Buffer.byteLength(body),
        sha256: crypto.createHash("sha256").update(body).digest("hex"),
      };
      console.log(`${match ? "OK  " : "FEJL"} ${t.name.padEnd(26)} ${String(rows.length).padStart(6)} / ${exactCount} rækker`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (e instanceof PermissionDenied && t.optional) {
        skipped.push(t.name);
        (manifest.tables as Record<string, unknown>)[t.name] = { skipped: true, reason: msg, needs: "pg_dump som postgres-rollen" };
        console.log(`SKIP ${t.name.padEnd(26)} ${msg} (kræver pg_dump)`);
      } else {
        ok = false;
        (manifest.tables as Record<string, unknown>)[t.name] = { error: msg };
        console.log(`FEJL ${t.name.padEnd(26)} ${msg}`);
      }
    }
  }

  // PostgREST's OpenAPI-beskrivelse = kolonner og typer for alt, hvad API'et kan se
  try {
    const res = await fetch(`${url}/rest/v1/`, { headers: { apikey: key!, Authorization: `Bearer ${key}` } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = JSON.stringify(await res.json(), null, 2);
    fs.writeFileSync(path.join(dir, "openapi.json"), body);
    (manifest as Record<string, unknown>).openapi = { bytes: Buffer.byteLength(body) };
    console.log(`OK   openapi.json (skemabeskrivelse)`);
  } catch (e) {
    console.log(`ADVARSEL openapi.json kunne ikke hentes: ${e instanceof Error ? e.message : e}`);
  }

  (manifest as Record<string, unknown>).coreTablesComplete = ok;
  (manifest as Record<string, unknown>).skippedNeedingPgDump = skipped;
  fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

  if (!ok) {
    console.log("\nBackup UFULDSTÆNDIG. Se FEJL ovenfor. Tag ikke skridt 3 før det er rettet.");
  } else {
    console.log("\nKerne-tabellerne (retailers, products, links, prices) er hentet med korrekt antal rækker.");
    if (skipped.length) {
      console.log(`\nADVARSEL: ${skipped.length} tabeller (${skipped.join(", ")}) kan IKKE læses via API'et.`);
      console.log("Dette er IKKE en komplet backup. Tag pg_dump (data + skema + funktioner) før skridt 3.");
    }
  }
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error("Backup fejlede:", e instanceof Error ? e.message : e);
  process.exit(1);
});
