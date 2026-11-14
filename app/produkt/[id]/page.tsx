import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductDetail } from "@/lib/data/products";
import { PriceChart } from "@/components/price-chart";
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
import { Badge } from "@/components/ui/badge";

const priceFormatter = new Intl.NumberFormat("da-DK", {
  style: "currency",
  currency: "DKK",
});

const dateFormatter = new Intl.DateTimeFormat("da-DK", {
  day: "numeric",
  month: "short",
});

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

  // Check om der er reel prisudvikling (mindst ét link har ændret pris)
  const hasRealDevelopment = product.priceHistory.some((point) => {
    // For at have reel udvikling, skal der være mindst 2 forskellige priser for samme forhandler
    const pricesForRetailer = product.priceHistory
      .filter(p => p.retailerName === point.retailerName)
      .map(p => p.price);
    const uniquePrices = new Set(pricesForRetailer);
    return uniquePrices.size > 1;
  });

  // Til "Bedste pris" highlight
  // Type-cast: vi ved at alle offers i product.offers har inStock === true og price !== null
  // efter filtrering i getProductDetail
  const sortedOffers = product.offers as Array<{
    linkId: string;
    retailerName: string;
    retailerLogoUrl: string | null;
    productUrl: string;
    price: number;
    inStock: boolean;
    scrapedAt: string | null;
  }>;
  const cheapestOffer = sortedOffers[0];
  const mostExpensiveOffer = sortedOffers[sortedOffers.length - 1];

  // Beregn besparelsevisning
  const hasMultipleOffers = sortedOffers.length > 1;
  const savingsAmount = hasMultipleOffers 
    ? (mostExpensiveOffer?.price ?? 0) - (cheapestOffer?.price ?? 0)
    : 0;
  const savingsPercentage = hasMultipleOffers && mostExpensiveOffer?.price && mostExpensiveOffer.price > 0
    ? Math.round((savingsAmount / mostExpensiveOffer.price) * 100)
    : 0;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10">
      {/* Tilbage-knap */}
      <div className="mb-4">
        <Button
          variant="ghost"
          className="-ml-4"
          nativeButton={false}
          render={<Link href="/">← Tilbage til forsiden</Link>}
        />
      </div>

      {/* 1. HERO-SEKTION - Fuld bredde */}
      <section className="w-full">
        <div className="flex flex-col gap-6 md:flex-row md:gap-8">
          {/* Billede - større end før, højformat */}
          <div className="flex-shrink-0">
            {product.image_url ? (
              <Image
                src={product.image_url}
                alt={product.name}
                width={224}
                height={280}
                className="h-[280px] w-[224px] rounded-lg object-contain bg-white p-4"
              />
            ) : (
              <div className="flex h-[280px] w-[224px] items-center justify-center rounded-lg bg-muted text-muted-foreground text-xs">
                Intet billede
              </div>
            )}
          </div>

          {/* Tekstblok */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">{product.name}</h1>
            
            {/* Brand · volumen · ABV */}
            <p className="mt-2 text-lg text-muted-foreground">
              {product.brand && <span>{product.brand}</span>}
              {product.brand && (product.volume_ml || product.abv) && <span> · </span>}
              {product.volume_ml && <span>{product.volume_ml} ml</span>}
              {product.volume_ml && product.abv && <span> · </span>}
              {product.abv && <span>{product.abv}% abv</span>}
            </p>

            {/* Beskrivelse - kun hvis den findes */}
            {product.description && (
              <p className="mt-4 text-foreground">{product.description}</p>
            )}
          </div>
        </div>
      </section>

      {/* 2. PRIS PR. FORHANDLER - kun hvis der er offers på lager */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle>Pris pr. forhandler</CardTitle>
          </CardHeader>
          <CardContent>
            {product.offers.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Produktet er i øjeblikket udsolgt alle steder.
              </p>
            ) : (
              <>
                {/* Bedste pris highlight */}
                {cheapestOffer && (
                  <div className="mb-6 rounded-lg bg-muted/50 p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
                      <span className="text-sm text-muted-foreground">
                        Bedste pris:
                      </span>
                      <span className="text-2xl font-bold text-accent">
                        {priceFormatter.format(cheapestOffer.price)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        hos {cheapestOffer.retailerName}
                      </span>
                      {hasMultipleOffers && savingsAmount > 0 && (
                        <>
                          <span className="text-sm text-muted-foreground">
                            · Spar {priceFormatter.format(savingsAmount)}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            ({savingsPercentage}% ift. dyreste forhandler)
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Mobil liste */}
                <div className="flex flex-col gap-3 sm:hidden">
                  {sortedOffers.map((offer, index) => (
                    <div
                      key={offer.linkId}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">
                            {offer.retailerName}
                          </p>
                          {index === 0 && (
                            <Badge variant="default" className="text-xs">
                              Bedste pris
                            </Badge>
                          )}
                        </div>
                        {offer.scrapedAt && (
                          <p className="text-xs text-muted-foreground">
                            {dateFormatter.format(new Date(offer.scrapedAt))}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 font-mono font-semibold text-accent">
                        {priceFormatter.format(offer.price)}
                      </span>
                      <div className="shrink-0">
                        <Button
                          variant="outline"
                          size="xs"
                          nativeButton={false}
                          render={
                            <a
                              href={offer.productUrl}
                              target="_blank"
                              rel="nofollow sponsored noopener noreferrer"
                            >
                              Køb hos {offer.retailerName}
                            </a>
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop tabel */}
                <div className="hidden sm:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Forhandler</TableHead>
                        <TableHead>Pris</TableHead>
                        <TableHead className="hidden md:table-cell">
                          Senest opdateret
                        </TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedOffers.map((offer, index) => (
                        <TableRow key={offer.linkId}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {offer.retailerName}
                              {index === 0 && (
                                <Badge variant="default" className="text-xs">
                                  Bedste pris
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono font-medium">
                            {priceFormatter.format(offer.price)}
                          </TableCell>
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
                                  rel="nofollow sponsored noopener noreferrer"
                                >
                                  Køb hos {offer.retailerName}
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
      </section>

      {/* 3. PRISUDVIKLING - kun hvis der er reel udvikling */}
      {hasRealDevelopment && (
        <section>
          <Card>
            <CardHeader>
              <CardTitle>Prisudvikling</CardTitle>
            </CardHeader>
            <CardContent>
              <PriceChart priceHistory={product.priceHistory} />
            </CardContent>
          </Card>
        </section>
      )}
    </main>
  );
}
