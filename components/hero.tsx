import type { CatalogStats } from "@/lib/data/products";
import Link from "next/link";

export function Hero({ stats }: { stats: CatalogStats }) {
  return (
    <section className="py-12">
      <div className="mx-auto max-w-5xl px-4">
        <div className="grid gap-8 sm:grid-cols-2">
          <div>
            <span className="block text-[11px] font-semibold tracking-widest uppercase text-amber-600">
              Prissammenligning på rom
            </span>
            <Link href="/" className="brand mt-2 mb-4 text-5xl font-bold tracking-tight leading-none sm:text-6xl lg:text-[6rem]" style={{ fontFamily: '"DM Serif Display", serif' }}>Rompriser</Link>
            <h1 className="mt-12 text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              Find den bedste pris på rom
            </h1>
            <p className="mt-4 text-base sm:text-lg text-muted-foreground">
              Vi tjekker priserne hos 3 danske forhandlere hver dag og viser dig,
              hvornår det er billigst at slå til.
            </p>
          </div>
          <div className="relative aspect-[4/3] sm:aspect-[3/4]">
            <img
              src="/Rom-illustration.jpg"
              alt="Rom illustration"
              className="w-full h-full rounded-lg object-cover"
            />
          </div>
        </div>
        <div className="mt-16 flex flex-col gap-6 sm:flex-row sm:gap-8 lg:gap-16">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100/50">
              <svg className="h-5 w-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <p className="font-mono text-xl font-semibold">{stats.productCount}</p>
              <p className="text-sm text-muted-foreground">
                {stats.productCount === 1 ? "produkt" : "produkter"} hos {stats.retailerCount} forhandlere
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100/50">
              <svg className="h-5 w-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <p className="font-mono text-xl font-semibold">Prisfald</p>
              <p className="text-sm text-muted-foreground">
                Se de seneste prisfald
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100/50">
              <svg className="h-5 w-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-mono text-xl font-semibold">Opdateret</p>
              <p className="text-sm text-muted-foreground">
                Hver dag kl. 06:00
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
