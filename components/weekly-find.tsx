import Link from "next/link";
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
      <Link
        href={`/produkt/${find.productId}`}
        className="block rounded-2xl bg-[linear-gradient(120deg,#1F2420_0%,#4A3410_65%,#C17817_100%)] p-6 sm:p-10"
      >
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
      </Link>
      <p className="mt-2 text-xs text-muted-foreground">
        {stats.productCount}{" "}
        {stats.productCount === 1 ? "romprodukt" : "romprodukter"} fundet på
        tværs af {stats.retailerCount} danske forhandlere
      </p>
    </div>
  );
}
