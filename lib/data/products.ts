import { createClient } from "@/lib/supabase/server";

export interface ProductListItem {
  id: string;
  name: string;
  brand: string | null;
  volume_ml: number | null;
  category: string | null;
  image_url: string | null;
  lowestPrice: number;
  highestPrice: number;
  retailerCount: number;
}

// Forsidedata: kun produkter der reelt har en aktuel pris hos mindst én
// forhandler. Starter fra `product_lowest_prices` (ikke `products`), da
// viewets almindelige join mod product_retailer_links/latest_prices
// automatisk udelukker produkter uden pris — de skal aldrig vises på
// forsiden, så filtreringen skal ske i databasen, ikke i frontend.
export async function getProductListWithLowestPrice(): Promise<
  ProductListItem[]
> {
  const supabase = await createClient();

  const { data: lowestPrices, error: lowestPricesError } = await supabase
    .from("product_lowest_prices")
    .select("*");

  if (lowestPricesError) throw lowestPricesError;
  if (!lowestPrices || lowestPrices.length === 0) return [];

  const productIds = lowestPrices.map((row) => row.product_id);

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, name, brand, volume_ml, category, image_url")
    .in("id", productIds)
    .order("name");

  if (productsError) throw productsError;

  const lowestByProductId = new Map(
    lowestPrices.map((row) => [row.product_id, row]),
  );

  return (products ?? []).flatMap((product) => {
    const lowest = lowestByProductId.get(product.id);
    if (!lowest) return [];
    return [
      {
        ...product,
        lowestPrice: lowest.lowest_price,
        highestPrice: lowest.highest_price,
        retailerCount: lowest.retailer_count,
      },
    ];
  });
}

export interface WeeklyFind {
  productId: string;
  name: string;
  imageUrl: string | null;
  lowestPrice: number;
  editorialLine: string;
}

// "Ugens fund": produktet med størst procentvist prisfald siden forrige
// scrape. Falder tilbage til produktet med flest forhandlere (bedst
// datadækning) når der endnu ikke findes prishistorik at sammenligne med,
// så modulet aldrig står tomt så længe mindst ét produkt har en pris.
export async function getWeeklyFind(): Promise<WeeklyFind | null> {
  const supabase = await createClient();

  const [{ data: drops }, { data: lowestPrices }] = await Promise.all([
    supabase
      .from("product_price_drops")
      .select("product_id, best_price_drop_pct")
      .gt("best_price_drop_pct", 0)
      .order("best_price_drop_pct", { ascending: false }),
    supabase
      .from("product_lowest_prices")
      .select("product_id, lowest_price, retailer_count"),
  ]);

  const lowestByProductId = new Map(
    (lowestPrices ?? []).map((row) => [row.product_id, row]),
  );

  let productId: string | null = null;
  let lowestPrice = 0;
  let editorialLine = "";

  // Det bedste prisfald tæller kun hvis produktet stadig har en aktuel
  // pris et sted (kan være udsolgt alle steder siden faldet blev målt).
  const dropCandidate = (drops ?? []).find((drop) =>
    lowestByProductId.has(drop.product_id),
  );

  if (dropCandidate) {
    const lowest = lowestByProductId.get(dropCandidate.product_id)!;
    productId = dropCandidate.product_id;
    lowestPrice = lowest.lowest_price;
    editorialLine = `Prisen er faldet ${Math.round(dropCandidate.best_price_drop_pct)}% siden sidste prischeck`;
  } else {
    const fallback = [...lowestByProductId.values()].sort(
      (a, b) =>
        b.retailer_count - a.retailer_count || a.lowest_price - b.lowest_price,
    )[0];
    if (fallback) {
      productId = fallback.product_id;
      lowestPrice = fallback.lowest_price;
      editorialLine = `Bredest tilgængelig — sammenlignet på tværs af ${fallback.retailer_count} ${
        fallback.retailer_count === 1 ? "forhandler" : "forhandlere"
      }`;
    }
  }

  if (!productId) return null;

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, name, image_url")
    .eq("id", productId)
    .maybeSingle();

  if (productError) throw productError;
  if (!product) return null;

  return {
    productId: product.id,
    name: product.name,
    imageUrl: product.image_url,
    lowestPrice,
    editorialLine,
  };
}

export interface CatalogStats {
  productCount: number;
  retailerCount: number;
}

// Infolinje under "Ugens fund": samlet dækning på tværs af hele katalogget.
export async function getCatalogStats(): Promise<CatalogStats> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("catalog_stats")
    .select("*")
    .maybeSingle();

  if (error) throw error;

  return {
    productCount: data?.product_count ?? 0,
    retailerCount: data?.retailer_count ?? 0,
  };
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
  image_url: string | null;
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
    .select("id, name, brand, volume_ml, abv, category, image_url")
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
