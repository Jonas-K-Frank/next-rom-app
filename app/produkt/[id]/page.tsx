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

const priceFormatter = new Intl.NumberFormat("da-DK", {
  style: "currency",
  currency: "DKK",
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Forhandler</TableHead>
                  <TableHead>Pris</TableHead>
                  <TableHead>Lager</TableHead>
                  <TableHead>Senest opdateret</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {product.offers.map((offer) => (
                  <TableRow key={offer.linkId}>
                    <TableCell className="font-medium">
                      {offer.retailerName}
                    </TableCell>
                    <TableCell>
                      {offer.price !== null
                        ? priceFormatter.format(offer.price)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {offer.inStock === null
                        ? "—"
                        : offer.inStock
                          ? "På lager"
                          : "Udsolgt"}
                    </TableCell>
                    <TableCell>
                      {offer.scrapedAt
                        ? new Date(offer.scrapedAt).toLocaleDateString(
                            "da-DK",
                          )
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
          )}
        </CardContent>
      </Card>
    </main>
  );
}
