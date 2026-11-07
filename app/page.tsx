import {
  getCatalogStats,
  getProductListWithLowestPrice,
  getWeeklyFind,
} from "@/lib/data/products";
import HomeClient from "./HomeClient";

export default async function Home() {
  const [products, weeklyFind, catalogStats] = await Promise.all([
    getProductListWithLowestPrice(),
    getWeeklyFind(),
    getCatalogStats(),
  ]);

  return (
    <HomeClient
      initialProducts={products}
      weeklyFind={weeklyFind}
      catalogStats={catalogStats}
    />
  );
}
