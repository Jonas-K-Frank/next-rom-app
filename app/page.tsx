import {
  getCatalogStats,
  getProductListWithLowestPrice,
  getMonthlyFind,
} from "@/lib/data/products";
import HomeClient from "./HomeClient";

// Priser opdateres månedligt → cach siden i 1 time (ISR).
// Efter hver scraping-runde deployes ny version og cachen fornys automatisk.
export const revalidate = 3600;

export default async function Home() {
  const [products, monthlyFind, catalogStats] = await Promise.all([
    getProductListWithLowestPrice(),
    getMonthlyFind(),
    getCatalogStats(),
  ]);

  return (
    <HomeClient
      initialProducts={products}
      monthlyFind={monthlyFind}
      catalogStats={catalogStats}
    />
  );
}
