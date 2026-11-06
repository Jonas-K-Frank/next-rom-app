import { Search } from "lucide-react";
import {
  getCatalogStats,
  getProductListWithLowestPrice,
  getWeeklyFind,
} from "@/lib/data/products";
import { ProductCard } from "@/components/product-card";
import { WeeklyFindModule } from "@/components/weekly-find";
import { Hero } from "@/components/hero";
import { Input } from "@/components/ui/input";

export default async function Home() {
  const [products, weeklyFind, catalogStats] = await Promise.all([
    getProductListWithLowestPrice(),
    getWeeklyFind(),
    getCatalogStats(),
  ]);

  return (
    <main className="flex w-full flex-1 flex-col">
      <Hero stats={catalogStats} />
      
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 pb-10">
        {weeklyFind && <WeeklyFindModule find={weeklyFind} stats={catalogStats} />}

        <div className="relative py-4">
          <Search className="pointer-events-none absolute top-1/2 left-5 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Søg efter rom, mærke eller kategori…"
            className="h-[50px] w-full rounded-full border-border-strong bg-white pl-13 text-[15px]"
          />
        </div>

        {products.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4">
            Ingen produkter endnu. Tilføj produkter og forhandler-links via
            Supabase Table Editor for at komme i gang.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
