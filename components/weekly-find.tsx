import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { CatalogStats, WeeklyFind } from "@/lib/data/products";

const priceFormatter = new Intl.NumberFormat("da-DK", {
  style: "currency",
  currency: "DKK",
});

// Eneste sted i designet der bruger en gradient — bevidst undtagelse for
// at gøre "Ugens fund" til det ene, tydelige fremhævede modul på forsiden.
export function WeeklyFindModule({
  find,
  stats,
}: {
  find: WeeklyFind;
  stats: CatalogStats;
}) {
  return (
    <div>
      <div className="rounded-2xl bg-[linear-gradient(120deg,#1F2420_0%,#4A3410_65%,#C17817_100%)] p-6 sm:p-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1">
            <span className="text-[11px] font-semibold tracking-wide text-[#F0C77A] uppercase">
              Ugens fund
            </span>
            <h2 className="mt-1 text-2xl font-semibold text-white">
              {find.name}
            </h2>
            <p className="mt-1 text-sm text-white/70">{find.editorialLine}</p>
            <p className="mt-3 font-mono text-[30px] font-semibold text-white">
              {priceFormatter.format(find.lowestPrice)}
            </p>
          </div>

          {/* Billede + CTA grupperet i samme højre kolonne på desktop,
              billedet før knappen. Billedet er skjult på mobil — ikke
              plads til det uden at teksten trænges. */}
          <div className="flex flex-col items-end gap-4">
            {find.imageUrl && (
              <div className="relative hidden aspect-[3/4] w-40 shrink-0 sm:block">
                <Image
                  src={find.imageUrl}
                  alt={find.name}
                  fill
                  className="object-contain"
                  sizes="160px"
                />
              </div>
            )}
            {/* Linker til produktsiden (prishistorik + alle forhandlere),
                ikke direkte til én forhandler — det ville modsige
                sammenligningen. */}
            <Button
              variant="outline"
              nativeButton={false}
              className="h-12 rounded-full border-transparent bg-white/90 px-6 text-base font-medium text-header shadow-none hover:bg-white"
              render={
                <Link href={`/produkt/${find.productId}`}>Se ugens fund</Link>
              }
            />
          </div>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {stats.productCount}{" "}
        {stats.productCount === 1 ? "romprodukt" : "romprodukter"} fundet på
        tværs af {stats.retailerCount} danske forhandlere
      </p>
    </div>
  );
}
