import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductDetail } from "@/lib/data/products";
import { PriceChart } from "@/components/price-chart";
import { PricePositionBar } from "@/components/price-position-bar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

const priceFormatter = new Intl.NumberFormat("da-DK", {
  style: "currency",
  currency: "DKK",
});

const dateFormatter = new Intl.DateTimeFormat("da-DK", {
  day: "numeric",
  month: "short",
});

function stockLabel(inStock: boolean | null) {
  if (inStock === null) return "—";
  return inStock ? "På lager" : "Udsolgt";
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProductDetail(id);

  if (!product) {
    notFound();
  }

  // Kun vis prisposition-baren når der reelt er noget at sammenligne.
  const offersWithPrice = product.offers.filter(
    (offer): offer is typeof offer & { price: number } => offer.price !== null,
  );
  const offerPrices = offersWithPrice.map((offer) => offer.price);
  const hasPriceRange =
    offerPrices.length > 1 && Math.max(...offerPrices) > Math.min(...offerPrices);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10">
      <div>
        <Button
          variant="ghost"
          className="-ml-4 mb-2"
          nativeButton={false}
          render={<Link href="/">← Tilbage til forsiden</Link>}
        />
        <div className="flex items-center gap-4">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              width={80}
              height={80}
              className="rounded-md object-contain"
            />
          ) : (
            <div className="flex size-20 items-center justify-center rounded-md bg-muted text-muted-foreground text-xs">
              Intet billede
            </div>
          )}
          <div>
            <h1 className="text-2xl font-semibold">{product.name}</h1>
            <p className="text-muted-foreground">
              {[product.brand, product.category, product.volume_ml && `${product.volume_ml} ml`, product.abv && `${product.abv}% abv`]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prisudvikling</CardTitle>
        </CardHeader>
        <CardContent>
          <PriceChart priceHistory={product.priceHistory} />
        </CardContent>
      </Card>

      {hasPriceRange && (
        <Card>
          <CardHeader>
            <CardTitle>Prisposition</CardTitle>
          </CardHeader>
          <CardContent>
            <PricePositionBar
              points={offersWithPrice.map((offer) => ({
                label: offer.retailerName,
                price: offer.price,
              }))}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Pris pr. forhandler</CardTitle>
        </CardHeader>
        <CardContent>
          {product.offers.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Ingen forhandlere linket til dette produkt endnu.
            </p>
          ) : (
            <>
              {/* Under sm er en tabel med 5 kolonner for bred til skærmen
                  (CTA-knappen og hele årstallet endte uden for viewporten),
                  så mobil får en stablet liste i stedet. */}
              <div className="flex flex-col gap-3 sm:hidden">
                {product.offers.map((offer) => (
                  <div
                    key={offer.linkId}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">
                        {offer.retailerName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {stockLabel(offer.inStock)}
                        {offer.scrapedAt &&
                          ` · ${dateFormatter.format(new Date(offer.scrapedAt))}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className="font-mono font-semibold text-accent">
                        {offer.price !== null
                          ? priceFormatter.format(offer.price)
                          : "—"}
                      </span>
                      <Button
                        variant="outline"
                        size="xs"
                        nativeButton={false}
                        render={
                          <a
                            href={offer.productUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Gå til butik
                          </a>
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Forhandler</TableHead>
                      <TableHead>Pris</TableHead>
                      <TableHead>Lager</TableHead>
                      <TableHead className="hidden md:table-cell">
                        Senest opdateret
                      </TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {product.offers.map((offer) => (
                      <TableRow key={offer.linkId}>
                        <TableCell className="font-medium">
                          {offer.retailerName}
                        </TableCell>
                        <TableCell className="font-mono font-medium">
                          {offer.price !== null
                            ? priceFormatter.format(offer.price)
                            : "—"}
                        </TableCell>
                        <TableCell>{stockLabel(offer.inStock)}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {offer.scrapedAt
                            ? dateFormatter.format(new Date(offer.scrapedAt))
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            nativeButton={false}
                            render={
                              <a
                                href={offer.productUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Gå til butik
                              </a>
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
