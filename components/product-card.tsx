import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { PricePositionBar } from "@/components/price-position-bar";
import type { ProductListItem } from "@/lib/data/products";

const priceFormatter = new Intl.NumberFormat("da-DK", {
  style: "currency",
  currency: "DKK",
});

export function ProductCard({ product }: { product: ProductListItem }) {
  const { lowestPrice, highestPrice } = product;

  // Kun en meningsfuld "position" når vi rent faktisk har et interval
  // (mindst to forhandlere med forskellig pris).
  const hasRange = highestPrice > lowestPrice;

  return (
    <Link href={`/produkt/${product.id}`} className="block h-full">
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardContent className="flex h-full flex-col gap-3">
          {/* Flasken skal være blikfanget, ikke gemt væk: højformat,
              object-contain så hele flasken altid er synlig. */}
          <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-white sm:aspect-[3/4]">
            {product.image_url ? (
              <Image
                src={product.image_url}
                alt={product.name}
                fill
                className="object-contain p-3"
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                Intet billede
              </div>
            )}
          </div>

          {/* Fast min-height, så navn/pris/bar aldrig presses sammen eller
              skæres af, og alle kort i grid'et forbliver ensartede i
              højden uanset om prisposition-baren renderes eller ej. */}
          <div className="flex min-h-[140px] sm:min-h-[152px] flex-col gap-2">
            <div>
              <h2 className="line-clamp-2 font-medium text-foreground">
                {product.name}
              </h2>
              <p className="text-xs text-muted-foreground">
                {[
                  product.volume_ml ? `${product.volume_ml} ml` : null,
                  `${product.retailerCount} ${
                    product.retailerCount === 1 ? "forhandler" : "forhandlere"
                  }`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>

            <p className="font-mono text-2xl font-semibold text-accent">
              {priceFormatter.format(lowestPrice)}
            </p>

            {hasRange && (
              <PricePositionBar
                points={[{ label: "Laveste pris", price: lowestPrice }]}
                min={lowestPrice}
                max={highestPrice}
                className="mt-auto"
              />
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
