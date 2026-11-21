import Image from "next/image";
import type { Metadata } from "next";
import { BackButton } from "./back-button";
import { notFound } from "next/navigation";
import { getProductDetail } from "@/lib/data/products";
import { cleanDisplayName } from "@/lib/utils";
import { PriceChart } from "@/components/price-chart";
import { PencilFrame } from "@/components/pencil-frame";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const priceFormatter = new Intl.NumberFormat("da-DK", {
  style: "currency",
  currency: "DKK",
});

// Priser/prishistorik opdateres månedligt → cach produktsider i 1 time (ISR)
export const revalidate = 3600;

// SEO: unik title/description pr. produkt til søgemaskiner og delinger.
// offers er allerede filtreret (kun in-stock + pris) og sorteret stigende.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductDetail(id);
  if (!product) return {};

  const displayName = cleanDisplayName(product.name);
  const details = [
    product.volume_cl ? `${product.volume_cl} cl` : null,
    product.abv ? `${product.abv}%` : null,
  ].filter(Boolean).join(", ");

  const cheapest = product.offers[0];
  // offers er runtime-filtreret til in-stock + pris, men typen siger
  // stadig price: number | null — indsnævr derfor, før priceFormatter.format.
  const cheapestPrice = cheapest?.price ?? null;
  const shopSuffix =
    product.offers.length === 1
      ? "hos en dansk forhandler"
      : `hos ${product.offers.length} danske forhandlere`;

  const title = `${displayName}${details ? ` (${details})` : ""} | Rompriser`;
  const description = cheapestPrice !== null
    ? `${displayName} koster ${priceFormatter.format(cheapestPrice)} ${shopSuffix}. Se pris, lagerstatus og prishistorik på Rompriser.`
    : `${displayName} — pris, lagerstatus og prishistorik fra danske forhandlere, samlet på Rompriser.`;

  return {
    title,
    description,
    alternates: { canonical: `/produkt/${id}` },
    openGraph: {
      title,
      description,
      images: product.image_url ? [{ url: product.image_url }] : undefined,
    },
  };
}

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

  // Beregn hasRealDevelopment: true hvis mindst ét link har ≥2 priser hvor min ≠ max
  const hasRealDevelopment = product.priceHistory.some((point) => {
    const pricesForRetailer = product.priceHistory
      .filter(p => p.retailerName === point.retailerName)
      .map(p => p.price);
    if (pricesForRetailer.length < 2) return false;
    const min = Math.min(...pricesForRetailer);
    const max = Math.max(...pricesForRetailer);
    return min !== max;
  });

  // Type assertion: offers are filtered to only include in-stock with non-null prices
  const offers = product.offers as Array<{
    linkId: string;
    retailerName: string;
    retailerLogoUrl: string | null;
    productUrl: string;
    price: number;
    inStock: boolean;
    scrapedAt: string | null;
  }>;
  const cheapestOffer = offers[0];
  const mostExpensiveOffer = offers[offers.length - 1];
  const hasMultipleOffers = offers.length > 1;
  const savingsAmount = hasMultipleOffers 
    ? (mostExpensiveOffer?.price ?? 0) - (cheapestOffer?.price ?? 0)
    : 0;
  const savingsPercentage = hasMultipleOffers && mostExpensiveOffer?.price && mostExpensiveOffer.price > 0
    ? Math.round((savingsAmount / mostExpensiveOffer.price) * 100)
    : 0;

  // Stempel tekst: land, med kategori som fallback
  const stampText = product.country ?? product.category ?? "Rom";

  // JSON-LD til søgemaskiner: schema.org Product med pristilbud.
  // Én forhandler → Offer; flere → AggregateOffer (lav/høj pris).
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: cleanDisplayName(product.name),
    ...(product.image_url ? { image: product.image_url } : {}),
    ...(product.description ? { description: product.description } : {}),
  };
  if (offers.length > 0 && cheapestOffer) {
    jsonLd.offers = hasMultipleOffers
      ? {
          "@type": "AggregateOffer",
          priceCurrency: "DKK",
          lowPrice: cheapestOffer.price,
          highPrice: mostExpensiveOffer?.price,
          offerCount: offers.length,
          availability: "https://schema.org/InStock",
        }
      : {
          "@type": "Offer",
          priceCurrency: "DKK",
          price: cheapestOffer.price,
          availability: "https://schema.org/InStock",
        };
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Tilbage-knap - husker scroll-position via browserens historie */}
      <div className="mb-4">
        <BackButton />
      </div>

      {/* TRIN 3: HERO-SEKTION */}
      <section className="flex flex-col gap-8 sm:flex-row sm:items-start">
        {/* Billede i blyantstreg-kort, let roteret */}
        <div className="relative mx-auto w-full max-w-[300px] shrink-0 -rotate-[0.6deg] rounded-lg bg-[#FBFBF2] p-6 sm:mx-0">
          <PencilFrame />
          {product.image_url ? (
            <div className="relative z-10 aspect-[3/4]">
              <Image src={product.image_url} alt={product.name} fill priority quality={70}
                className="object-contain" sizes="300px" />
            </div>
          ) : (
            <div className="relative z-10 flex aspect-[3/4] items-center justify-center text-xs text-muted-foreground">
              Intet billede
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          {/* Brand-stempel (fallback: kategori) */}
          <span className="mb-4 inline-block -rotate-3 rounded-[3px] border-[2.5px] border-pencil-accent px-4 py-1 text-[13px] font-bold tracking-[4px] text-pencil-accent uppercase">
            {stampText}
          </span>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {cleanDisplayName(product.name)}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {[product.volume_cl ? `${product.volume_cl} cl` : null,
              product.abv ? `${product.abv}% abv` : null]
              .filter(Boolean).join(" · ")}
          </p>
          {product.description && (
            <div className="mt-5">
              <h2 className="text-[11px] font-bold uppercase tracking-[2.5px] text-pencil-accent">
                Om denne rom
              </h2>
              <p className="mt-2 max-w-[54ch] text-[15px] leading-relaxed text-foreground/90">
                {product.description}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* TRIN 4: Bedstepris-boks (kun hvis der er tilbud) */}
      {offers.length > 0 && (
        <section>
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-card px-6 py-5 shadow-[2px_4px_12px_rgba(26,26,24,0.08)]">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[2.5px] text-muted-foreground">
                {hasMultipleOffers ? "Bedste pris" : "Pris"}
              </p>
              <p className="mt-1 text-3xl font-bold leading-none text-pencil-accent sm:text-[40px]">
                {priceFormatter.format(cheapestOffer.price)} kr.
              </p>
              {hasMultipleOffers && savingsAmount > 0 && (
                <p className="mt-2 text-sm font-semibold text-success">
                  Spar {priceFormatter.format(savingsAmount)} kr. (
                  {savingsPercentage}%) ift. dyreste forhandler
                </p>
              )}
            </div>
            <a href={cheapestOffer.productUrl} target="_blank" rel="nofollow sponsored noopener noreferrer"
               className="-rotate-1 rounded-[2px] bg-foreground px-5 py-2.5 text-sm font-medium text-background shadow-[2px_3px_0_rgba(17,17,17,0.15)] hover:bg-pencil-accent">
              Køb hos {cheapestOffer.retailerName}
            </a>
          </div>
        </section>
      )}

      {/* TRIN 5: Forhandler-tabel i blyantstreg-kort */}
      {offers.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-bold">Pris pr. forhandler</h2>
          <div className="relative rounded-lg bg-[#FBFBF2] px-5 py-2">
            <PencilFrame />
            <Table className="relative z-10">
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
                {offers.map((offer, index) => (
                  <TableRow key={offer.linkId}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {offer.retailerName}
                        {index === 0 && hasMultipleOffers && (
                          <span className="ml-2 inline-block -rotate-2 rounded-[3px] border-2 border-pencil-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-[2px] text-pencil-accent">
                            Bedste pris
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className={`font-mono font-medium ${index === 0 ? 'text-pencil-accent' : ''}`}>
                      {priceFormatter.format(offer.price)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {offer.scrapedAt
                        ? dateFormatter.format(new Date(offer.scrapedAt))
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <a
                        href={offer.productUrl}
                        target="_blank"
                        rel="nofollow sponsored noopener noreferrer"
                        className="block rounded-[2px] bg-foreground px-4 py-2 text-center text-sm font-medium text-background shadow-[2px_3px_0_rgba(17,17,17,0.15)] hover:bg-pencil-accent"
                      >
                        Køb hos {offer.retailerName}
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobil liste */}
          <div className="flex flex-col gap-3 sm:hidden">
            {offers.map((offer, index) => (
              <div
                key={offer.linkId}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-white p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">
                      {offer.retailerName}
                    </p>
                    {index === 0 && hasMultipleOffers && (
                      <span className="inline-block -rotate-2 rounded-[3px] border-2 border-pencil-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-[2px] text-pencil-accent">
                        Bedste pris
                      </span>
                    )}
                  </div>
                  {offer.scrapedAt && (
                    <p className="text-xs text-muted-foreground">
                      {dateFormatter.format(new Date(offer.scrapedAt))}
                    </p>
                  )}
                </div>
                <span className={`shrink-0 font-mono font-semibold ${index === 0 ? 'text-pencil-accent' : ''}`}>
                  {priceFormatter.format(offer.price)}
                </span>
                <div className="shrink-0">
                  <a
                    href={offer.productUrl}
                    target="_blank"
                    rel="nofollow sponsored noopener noreferrer"
                    className="block rounded-[2px] bg-foreground px-3 py-1.5 text-center text-xs font-medium text-background shadow-[2px_3px_0_rgba(17,17,17,0.15)] hover:bg-pencil-accent"
                  >
                    Køb
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Edge-case: ingen tilbud */}
      {offers.length === 0 && (
        <p className="text-sm text-muted-foreground">Produktet er i øjeblikket udsolgt alle steder.</p>
      )}

      {/* TRIN 6: Prisudvikling nederst, betinget */}
      {hasRealDevelopment && (
        <section>
          <h2 className="mb-3 text-xl font-bold">Prisudvikling</h2>
          <div className="relative rounded-lg bg-card p-6 shadow-[2px_4px_12px_rgba(26,26,24,0.08)]">
            <PencilFrame />
            <div className="relative z-10">
              <PriceChart priceHistory={product.priceHistory} />
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
