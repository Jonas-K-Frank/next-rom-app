"use client";
import { useState } from "react";
import { Search } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { WeeklyFindModule } from "@/components/weekly-find";
import { Hero } from "@/components/hero";
import { Input } from "@/components/ui/input";
import type { ProductListItem, WeeklyFind, CatalogStats } from "@/lib/data/products";

export default function Home({
  initialProducts,
  weeklyFind,
  catalogStats,
}: {
  initialProducts: ProductListItem[];
  weeklyFind: WeeklyFind | null;
  catalogStats: CatalogStats;
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProducts = initialProducts.filter((product) => {
    const query = searchQuery.toLowerCase();
    return (
      product.name.toLowerCase().includes(query) ||
      (product.brand?.toLowerCase().includes(query) ?? false) ||
      (product.category?.toLowerCase().includes(query) ?? false)
    );
  });

  const displayedProducts = searchQuery ? filteredProducts : initialProducts;

  return (
    <main className="flex w-full flex-1 flex-col">
      <Hero stats={catalogStats} />
      
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 pb-10">
        <form className="relative py-4" onSubmit={(e) => e.preventDefault()}>
          <Search className="pointer-events-none absolute top-1/2 left-5 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Søg efter rom, mærke eller kategori…"
            className="h-12 w-full rounded-full border-border-strong bg-white pl-13 text-[15px] sm:h-[50px]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>

        <div className={`transition-all duration-500 overflow-hidden ${searchQuery ? "max-h-0 opacity-0 mb-0" : "max-h-[500px] opacity-100 mb-6"}`}>
          {weeklyFind && <WeeklyFindModule find={weeklyFind} stats={catalogStats} />}
        </div>

        {displayedProducts.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4">
            {searchQuery
              ? `Ingen produkter fundet for "${searchQuery}"`
              : "Ingen produkter endnu. Tilføj produkter og forhandler-links via Supabase Table Editor for at komme i gang."}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {displayedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
