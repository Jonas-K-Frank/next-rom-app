"use client";
import { useState, useEffect } from "react";
import { ProductCard } from "@/components/product-card";
import { MonthlyFindModule } from "@/components/monthly-find";
import { Hero } from "@/components/hero";
import { SearchField } from "@/components/search-field";
import type { ProductListItem, MonthlyFind, CatalogStats } from "@/lib/data/products";

export default function Home({
  initialProducts,
  monthlyFind,
  catalogStats,
}: {
  initialProducts: ProductListItem[];
  monthlyFind: MonthlyFind | null;
  catalogStats: CatalogStats;
}) {
  console.log('initialProducts ialt:', initialProducts.length);
  console.log('bacardi i initialProducts:', initialProducts.filter(p => p.name.toLowerCase().includes('bacardi')).length);
  
  const [searchQuery, setSearchQuery] = useState("");

  // Reset search on page refresh/mount
  useEffect(() => {
    setSearchQuery("");
  }, []);

  // Log products with/without images for debugging
  useEffect(() => {
    const withImage = initialProducts.filter(p => p.image_url).length;
    const withoutImage = initialProducts.filter(p => !p.image_url).length;
    console.log(`Products: ${initialProducts.length} total, ${withImage} with image, ${withoutImage} without image`);
    if (withoutImage > 0) {
      console.log("Products without image:", initialProducts.filter(p => !p.image_url).map(p => p.name));
    }
  }, [initialProducts]);

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
        <div className="py-4">
          <SearchField searchQuery={searchQuery} onSearchChange={setSearchQuery} />
        </div>

        <div className={`transition-all duration-500 overflow-hidden ${searchQuery ? "max-h-0 opacity-0 mb-0" : "max-h-[500px] opacity-100 mb-6"}`}>
          {monthlyFind && <MonthlyFindModule find={monthlyFind} stats={catalogStats} />}
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
