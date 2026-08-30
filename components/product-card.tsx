import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import {
  PricePositionBar,
  isBestRelativePrice,
} from "@/components/price-position-bar";
import type { ProductListItem } from "@/lib/data/products";
import { cn } from "@/lib/utils";

const priceFormatter = new Intl.NumberFormat("da-DK", {
  style: "currency",
  currency: "DKK",
});

export function ProductCard({ product }: { product: ProductListItem }) {
  const { lowestPrice, highestPrice } = product;

  // Kun en meningsfuld "position" når vi rent faktisk har et interval
  // (mindst to forhandlere med forskellig pris).
  const range =
    lowestPrice !== null && highestPrice !== null && highestPrice > lowestPrice
      ? { min: lowestPrice, max: highestPrice }
      : null;
  const isBestPrice = range
    ? isBestRelativePrice(range.min, range.min, range.max)
    : false;

  return (
    <Link href={`/produkt/${product.id}`} className="block h-full">
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardContent className="flex h-full flex-col gap-3">
          <div className="flex aspect-square items-center justify-center rounded-lg bg-muted p-4">
            {product.image_url ? (
              <Image
                src={product.image_url}
                alt={product.name}
                width={160}
                height={160}
                className="size-full object-contain"
              />
            ) : (
              <span className="text-xs text-muted-foreground">
                Intet billede
              </span>
            )}
          </div>

          <div>
            <h2 className="font-medium text-foreground">{product.name}</h2>
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

          <p
            className={cn(
              "font-mono text-2xl font-semibold",
              isBestPrice ? "text-success" : "text-accent",
            )}
          >
            {lowestPrice !== null
              ? priceFormatter.format(lowestPrice)
              : "Ikke på lager"}
          </p>

          {range && (
            <PricePositionBar
              points={[{ label: "Laveste pris", price: range.min }]}
              min={range.min}
              max={range.max}
              className="mt-auto"
            />
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
