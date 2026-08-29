import { createClient } from "@/lib/supabase/server";

export interface ProductListItem {
  id: string;
  name: string;
  brand: string | null;
  volume_ml: number | null;
  category: string | null;
  lowestPrice: number | null;
  retailerCount: number;
}

// Forsidedata: alle produkter beriget med laveste aktuelle pris på tværs af
// forhandlere. Bruger `product_lowest_prices`-viewet frem for at hente hele
// prishistorikken, så forsiden forbliver billig at rendere.
export async function getProductListWithLowestPrice(): Promise<
  ProductListItem[]
> {
  const supabase = await createClient();

  const [{ data: products, error: productsError }, { data: lowestPrices }] =
    await Promise.all([
      supabase
        .from("products")
        .select("id, name, brand, volume_ml, category")
        .order("name"),
      supabase.from("product_lowest_prices").select("*"),
    ]);

  if (productsError) throw productsError;

  const lowestByProductId = new Map(
    (lowestPrices ?? []).map((row) => [row.product_id, row]),
  );

  return (products ?? []).map((product) => {
    const lowest = lowestByProductId.get(product.id);
    return {
      ...product,
      lowestPrice: lowest?.lowest_price ?? null,
      retailerCount: lowest?.retailer_count ?? 0,
    };
  });
}

export interface RetailerOffer {
  linkId: string;
  retailerName: string;
  retailerLogoUrl: string | null;
  productUrl: string;
  price: number | null;
  inStock: boolean | null;
  scrapedAt: string | null;
}

export interface PriceHistoryPoint {
  scrapedAt: string;
  retailerName: string;
  price: number;
}

export interface ProductDetail {
  id: string;
  name: string;
  brand: string | null;
  volume_ml: number | null;
  abv: number | null;
  category: string | null;
  offers: RetailerOffer[];
  priceHistory: PriceHistoryPoint[];
}

// Produktsidedata: stamdata, aktuel pris pr. forhandler og fuld
// prishistorik (til grafen) for alle forhandlerens links til produktet.
export async function getProductDetail(
  productId: string,
): Promise<ProductDetail | null> {
  const supabase = await createClient();

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, name, brand, volume_ml, abv, category")
    .eq("id", productId)
    .maybeSingle();

  if (productError) throw productError;
  if (!product) return null;

  const { data: links, error: linksError } = await supabase
    .from("product_retailer_links")
    .select("id, product_url, retailers(name, logo_url)")
    .eq("product_id", productId);

  if (linksError) throw linksError;

  const linkIds = (links ?? []).map((link) => link.id);

  const [{ data: latestPrices }, { data: priceHistoryRows }] =
    await Promise.all([
      linkIds.length
        ? supabase.from("latest_prices").select("*").in("link_id", linkIds)
        : Promise.resolve({ data: [] as never[] }),
      linkIds.length
        ? supabase
            .from("prices")
            .select("link_id, price, scraped_at")
            .in("link_id", linkIds)
            .order("scraped_at", { ascending: true })
        : Promise.resolve({ data: [] as never[] }),
    ]);

  const latestByLinkId = new Map(
    (latestPrices ?? []).map((row) => [row.link_id, row]),
  );
  const retailerNameByLinkId = new Map(
    (links ?? []).map((link) => [link.id, link.retailers?.name ?? "Ukendt"]),
  );

  const offers: RetailerOffer[] = (links ?? []).map((link) => {
    const latest = latestByLinkId.get(link.id);
    return {
      linkId: link.id,
      retailerName: link.retailers?.name ?? "Ukendt forhandler",
      retailerLogoUrl: link.retailers?.logo_url ?? null,
      productUrl: link.product_url,
      price: latest?.price ?? null,
      inStock: latest?.in_stock ?? null,
      scrapedAt: latest?.scraped_at ?? null,
    };
  });

  const priceHistory: PriceHistoryPoint[] = (priceHistoryRows ?? []).map(
    (row) => ({
      scrapedAt: row.scraped_at,
      retailerName: retailerNameByLinkId.get(row.link_id) ?? "Ukendt",
      price: row.price,
    }),
  );

  return { ...product, offers, priceHistory };
}
