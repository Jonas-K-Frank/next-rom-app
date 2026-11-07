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
             Find din næste yndlingsrom til den bedste pris
            </h1>
            <p className="mt-4 text-base sm:text-lg text-muted-foreground">
              Vi sammenligner priserne hos Danmarks førende forhandlere af rom, så du altid gør den bedste handel.
            </p>
            <div className="mt-8 flex flex-col gap-6 sm:gap-8">
              <div className="flex items-start gap-4">
                <img src="/alle-store-forhandlere.svg" alt="" className="h-16 w-16 shrink-0 -mt-3" />
                <div>
                  <h3 className="font-semibold text-header">Alle store forhandlere</h3>
                  <p className="text-sm text-muted-foreground">
                    Vi sammenligner alt fra specialbutikker til landets største supermarkeder.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <img src="/kun-danske-butikker.svg" alt="" className="h-16 w-16 shrink-0 -mt-4" />
                <div>
                  <h3 className="font-semibold text-header">Kun danske butikker</h3>
                  <p className="text-sm text-muted-foreground">
                    Gå på opdagelse i flere danske webshops samlet ét sted.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="relative aspect-[4/3] sm:aspect-[3/4]">
            <img
              src="/Rom-illustration.jpg"
              alt="Rom illustration"
              className="w-full h-full rounded-lg object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
