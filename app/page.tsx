import {
  getCatalogStats,
  getProductListWithLowestPrice,
  getMonthlyFind,
} from "@/lib/data/products";
import HomeClient from "./HomeClient";

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
