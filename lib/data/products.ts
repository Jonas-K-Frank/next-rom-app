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

// Hjælpefunktion til at hente ALLE rækker ved paginering med .range()
async function fetchAll(
  supabase: any,
  table: string,
  select: string,
  order: string,
): Promise<any[]> {
  const PAGE = 1000; // præcis under serverens db-max-rows loft
  let from = 0,
    all: any[] = [];
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .order(order)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    all.push(...data);
    if (data.length < PAGE) return all; // sidste side — ikke flere rækker
    from += PAGE;
  }
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

  // Fetch ALL products via pagination
  const productsData = await fetchAll(
    supabase,
    "products",
    "id, name, brand, volume_ml, category, image_url",
    "name"
  );

  // Fetch ALL prices via pagination
  const pricesData = await fetchAll(
    supabase,
    "product_lowest_prices",
    "product_id, lowest_price, highest_price, retailer_count",
    "product_id"
  );

  // Create a map of product_id to price info
  const priceMap = new Map<
    string,
    { lowest_price: number; highest_price: number; retailer_count: number }
  >();
  (pricesData ?? []).forEach((price) => {
    priceMap.set(price.product_id, {
      lowest_price: price.lowest_price,
      highest_price: price.highest_price,
      retailer_count: price.retailer_count,
    });
  });

  // Map products to ProductListItem
  const result = (productsData ?? [])
    .filter((product) => priceMap.has(product.id))
    .map((product) => {
      const priceInfo = priceMap.get(product.id)!;
      return {
        ...product,
        image_url: product.image_url,
        lowestPrice: priceInfo.lowest_price,
        highestPrice: priceInfo.highest_price,
        retailerCount: priceInfo.retailer_count,
      };
    });

  console.log("initialProducts loaded:", result.length);
  return result;
}

export interface MonthlyFind {
  productId: string;
  name: string;
  imageUrl: string | null;
  lowestPrice: number;
  editorialLine: string;
}

// "Månedens fund": produktet med størst procentvist prisfald siden forrige
// scrape. Falder tilbage til produktet med flest forhandlere (bedst
// datadækning) når der endnu ikke findes prishistorik at sammenligne med,
// så modulet aldrig står tomt så længe mindst ét produkt har en pris.
export async function getMonthlyFind(): Promise<MonthlyFind | null> {
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
      editorialLine = `Bedste pris sammenlignet mellem ${fallback.retailer_count} ${
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

// Infolinje under "Månedens fund": samlet dækning på tværs af hele katalogget.
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
  description: string | null;
  offers: RetailerOffer[];
  priceHistory: PriceHistoryPoint[];
}

// Produktsidedata: stamdata, aktuel pris pr. forhandler og fuld
// prishistorik (til grafen) for alle forhandlerens links til produktet.
export async function getProductDetail(
  productId: string,
): Promise<ProductDetail | null> {
  const supabase = await createClient();

  // Prøv først uden description (kolonnen findes endnu ikke i DB)
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, name, brand, volume_ml, abv, category, image_url")
    .eq("id", productId)
    .maybeSingle();

  if (productError) throw productError;
  if (!product) return null;

  // TODO: aktiver når products.description findes - indtil da er det null
  const description: string | null = null;

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

  // Filtrer offers: kun in-stock og med pris
  const allOffers: RetailerOffer[] = (links ?? []).map((link) => {
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

  // Filtrer til kun offers med inStock === true og price !== null
  const offers: RetailerOffer[] = allOffers
    .filter((offer) => offer.inStock === true && offer.price !== null)
    .sort((a, b) => (a.price ?? 0) - (b.price ?? 0));

  // Prishistorik indeholder ALLE links (ogsaa dem der nu er udsolgt)
  const priceHistory: PriceHistoryPoint[] = (priceHistoryRows ?? []).map(
    (row) => ({
      scrapedAt: row.scraped_at,
      retailerName: retailerNameByLinkId.get(row.link_id) ?? "Ukendt",
      price: row.price,
    }),
  );

  // Konstruer return objektet med korrekte typer
  const result: ProductDetail = {
    id: product.id,
    name: product.name,
    brand: product.brand,
    volume_ml: product.volume_ml,
    abv: product.abv,
    category: product.category,
    image_url: product.image_url,
    description,
    offers,
    priceHistory,
  };

  return result;
}
