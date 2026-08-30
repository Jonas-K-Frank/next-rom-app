import { getProductListWithLowestPrice } from "@/lib/data/products";
import { ProductCard } from "@/components/product-card";

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
