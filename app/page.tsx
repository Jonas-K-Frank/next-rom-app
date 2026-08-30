import { Search } from "lucide-react";
import { getProductListWithLowestPrice } from "@/lib/data/products";
import { ProductCard } from "@/components/product-card";
import { Input } from "@/components/ui/input";

export default async function Home() {
  const products = await getProductListWithLowestPrice();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold">Rumpriser</h1>
        <p className="text-muted-foreground">
          Sammenlign priser på rom fra danske online forhandlere.
        </p>
      </div>

      {/* Rent visuelt for nu — filtrering af produkter kommer i et
          separat step. */}
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Søg efter rom, mærke eller kategori…"
          className="h-14 rounded-xl border-border bg-card pl-12 text-base shadow-sm"
        />
      </div>

      {products.length === 0 ? (
        <p className="text-muted-foreground text-sm">
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
    </main>
  );
}
