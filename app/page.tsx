import Image from "next/image";
import Link from "next/link";
import { getProductListWithLowestPrice } from "@/lib/data/products";
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

const priceFormatter = new Intl.NumberFormat("da-DK", {
  style: "currency",
  currency: "DKK",
});

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

      <Card>
        <CardHeader>
          <CardTitle>Alle produkter</CardTitle>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Ingen produkter endnu. Tilføj produkter og forhandler-links via
              Supabase Table Editor for at komme i gang.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14" />
                  <TableHead>Produkt</TableHead>
                  <TableHead>Mærke</TableHead>
                  <TableHead>Volumen</TableHead>
                  <TableHead>Forhandlere</TableHead>
                  <TableHead className="text-right">Laveste pris</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <Link href={`/produkt/${product.id}`}>
                        {product.image_url ? (
                          <Image
                            src={product.image_url}
                            alt={product.name}
                            width={40}
                            height={40}
                            className="rounded-md object-contain"
                          />
                        ) : (
                          <div className="flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground text-xs">
                            —
                          </div>
                        )}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link
                        href={`/produkt/${product.id}`}
                        className="hover:underline"
                      >
                        {product.name}
                      </Link>
                    </TableCell>
                    <TableCell>{product.brand ?? "—"}</TableCell>
                    <TableCell>
                      {product.volume_ml ? `${product.volume_ml} ml` : "—"}
                    </TableCell>
                    <TableCell>{product.retailerCount}</TableCell>
                    <TableCell className="text-right">
                      {product.lowestPrice !== null
                        ? priceFormatter.format(product.lowestPrice)
                        : "Ikke på lager"}
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
