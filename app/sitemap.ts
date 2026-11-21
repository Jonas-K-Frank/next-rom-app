import type { MetadataRoute } from "next";
import { getSitemapProducts } from "@/lib/data/products";

// Sitemap til søgemaskiner: forside + alle produktsider.
// Sideantallet cacher sammen med forsiden (revalidate), så sitemapet
// følger med den månedlige prisopdatering.

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getSitemapProducts();

  return [
    {
      url: SITE,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...products.map((product) => ({
      url: `${SITE}/produkt/${product.product_id}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
