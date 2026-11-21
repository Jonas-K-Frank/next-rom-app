/**
 * snapshot_baseline.ts
 * Skrivebeskyttet snapshot af nøgletal fra databasen, så vi kan sammenligne
 * før/efter hvert skridt i PLAN.md. Bruger kun anon-nøglen (samme rettigheder
 * som den offentlige side) og skriver ingenting til databasen.
 *
 * Kørsel:  npm run snapshot:baseline            -> baseline/db-snapshot.json
 *          npm run snapshot:baseline -- --out=x -> gemmer i baseline/x.json
 *
 * NB: Funktionerne i lib/data/products.ts kan ikke køres uden for Next
 * (de bruger cookies()), så queries og logik er spejlet her med samme
 * adfærd som koden har på tidspunktet for baseline.
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

config({ path: path.join(__dirname, "..", ".env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anonKey) {
  console.error("Mangler NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY i .env.local");
  process.exit(1);
}

const outArg = process.argv.find((a) => a.startsWith("--out="));
const outName = outArg ? outArg.slice("--out=".length) : "db-snapshot";
const supabase = createClient(url, anonKey);

const sha = (ids: string[]) =>
  crypto.createHash("sha256").update([...ids].sort().join(",")).digest("hex").slice(0, 16);

async function fetchAllIds(table: string, column: string): Promise<string[]> {
  const PAGE = 1000;
  let from = 0;
  const all: string[] = [];
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(column)
      .order(column)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    const rows = (data ?? []) as unknown as Record<string, string>[];
    all.push(...rows.map((r) => r[column]));
    if (rows.length < PAGE) return all;
    from += PAGE;
  }
}

async function exactCount(table: string): Promise<number> {
  const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
  if (error) throw new Error(`${table} count: ${error.message}`);
  return count ?? 0;
}

async function main() {
  // --- Tabel- og view-størrelser (eksakt tælling uden række-loft) ---
  const counts = {
    products: await exactCount("products"),
    retailers: await exactCount("retailers"),
    product_retailer_links: await exactCount("product_retailer_links"),
    prices: await exactCount("prices"),
    product_lowest_prices: await exactCount("product_lowest_prices"),
    product_price_drops: await exactCount("product_price_drops"),
  };

  // --- Forsiden: produkter med pris (paginerede id'er, som koden gør) ---
  const productIds = await fetchAllIds("products", "id");
  const lowestIds = await fetchAllIds("product_lowest_prices", "product_id");
  const lowestSet = new Set(lowestIds);
  const homepageIds = productIds.filter((id) => lowestSet.has(id));

  // --- catalog_stats ---
  const { data: stats, error: statsErr } = await supabase.from("catalog_stats").select("*").maybeSingle();
  if (statsErr) throw new Error(`catalog_stats: ${statsErr.message}`);

  // --- Månedens fund: spejler getMonthlyFind(), UDEN paginering (som koden i dag) ---
  const [dropsRes, lowestRes] = await Promise.all([
    supabase
      .from("product_price_drops")
      .select("product_id, best_price_drop_pct")
      .gt("best_price_drop_pct", 0)
      .order("best_price_drop_pct", { ascending: false }),
    supabase.from("product_lowest_prices").select("product_id, lowest_price, retailer_count"),
  ]);
  if (dropsRes.error) throw new Error(`drops: ${dropsRes.error.message}`);
  if (lowestRes.error) throw new Error(`lowest: ${lowestRes.error.message}`);
  const drops = dropsRes.data ?? [];
  const lowestRows = lowestRes.data ?? [];
  const lowestByProduct = new Map(lowestRows.map((r) => [r.product_id, r]));

  const dropCandidate = drops.find((d) => lowestByProduct.has(d.product_id));
  const fallback = [...lowestByProduct.values()].sort(
    (a, b) =>
      (b.retailer_count ?? 0) - (a.retailer_count ?? 0) || (a.lowest_price ?? 0) - (b.lowest_price ?? 0),
  )[0];
  const picked = dropCandidate
    ? { kind: "drop", product_id: dropCandidate.product_id, drop_pct: dropCandidate.best_price_drop_pct }
    : fallback
      ? { kind: "fallback", product_id: fallback.product_id }
      : null;

  let monthlyFind: unknown = null;
  if (picked) {
    const { data: p } = await supabase.from("products").select("id, name").eq("id", picked.product_id).maybeSingle();
    monthlyFind = { ...picked, name: p?.name ?? null, lowest_price: lowestByProduct.get(picked.product_id)?.lowest_price ?? null };
  }

  // --- 3 faste produktsider: de første 3 (efter id) med mindst 2 forhandlere ---
  const samples = lowestRows
    .filter((r) => (r.retailer_count ?? 0) >= 2)
    .sort((a, b) => a.product_id.localeCompare(b.product_id))
    .slice(0, 3);
  const sampleProducts = [];
  for (const s of samples) {
    const [{ data: prod }, { data: links }] = await Promise.all([
      supabase
        .from("products")
        .select("id, name, brand, volume_ml, abv, category, country, image_url, description")
        .eq("id", s.product_id)
        .maybeSingle(),
      supabase.from("product_retailer_links").select("id").eq("product_id", s.product_id),
    ]);
    const linkIds = (links ?? []).map((l) => l.id);
    const [{ data: latest }, { count: historyCount }] = await Promise.all([
      supabase.from("latest_prices").select("price, in_stock").in("link_id", linkIds),
      supabase.from("prices").select("*", { count: "exact", head: true }).in("link_id", linkIds),
    ]);
    const inStock = (latest ?? []).filter((l) => l.in_stock && l.price !== null);
    sampleProducts.push({
      id: s.product_id,
      name: prod?.name ?? null,
      volume_cl: prod?.volume_ml != null ? Math.round(prod.volume_ml / 10) : null,
      country: prod?.country ?? null,
      has_image: Boolean(prod?.image_url),
      has_description: Boolean(prod?.description),
      links: linkIds.length,
      offers_in_stock: inStock.length,
      lowest_price: inStock.length ? Math.min(...inStock.map((l) => Number(l.price))) : null,
      price_history_rows: historyCount ?? 0,
    });
  }

  const snapshot = {
    note: "Skrivebeskyttet snapshot (anon-nøgle). Se scripts/snapshot_baseline.ts",
    takenAt: new Date().toISOString(),
    counts,
    homepage: {
      productCountWithPrice: homepageIds.length,
      idFingerprint: sha(homepageIds),
    },
    catalogStats: { product_count: stats?.product_count ?? null, retailer_count: stats?.retailer_count ?? null },
    monthlyFind: {
      picked: monthlyFind,
      rowsReturnedByUnpaginatedDropsQuery: drops.length,
      rowsReturnedByUnpaginatedLowestPricesQuery: lowestRows.length,
      // Hvis tallet ovenfor er præcis 1000 (eller lig serverens loft), er resultatet afkortet.
      lowestPricesTruncatedByRowLimit: lowestRows.length < counts.product_lowest_prices,
      dropsTruncatedByRowLimit: drops.length < counts.product_price_drops && drops.length > 0 && drops.length % 1000 === 0,
    },
    sampleProductPages: sampleProducts,
  };

  const dir = path.join(__dirname, "..", "baseline");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${outName}.json`);
  fs.writeFileSync(file, JSON.stringify(snapshot, null, 2) + "\n");
  console.log(JSON.stringify(snapshot, null, 2));
  console.log(`\nGemt: ${path.relative(process.cwd(), file)}`);
}

main().catch((err) => {
  console.error("Snapshot fejlede:", err instanceof Error ? err.message : err);
  process.exit(1);
});
