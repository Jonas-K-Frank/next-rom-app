"use client";
import { useState, useEffect, useRef } from "react";
import type { MouseEvent } from "react";
import { ProductCard } from "@/components/product-card";
import { MonthlyFindModule } from "@/components/monthly-find";
import { Hero } from "@/components/hero";
import { SearchField } from "@/components/search-field";
import type { ProductListItem, MonthlyFind, CatalogStats } from "@/lib/data/products";

const PAGE_SIZE = 48;

export default function Home({
  initialProducts,
  monthlyFind,
  catalogStats,
}: {
  initialProducts: ProductListItem[];
  monthlyFind: MonthlyFind | null;
  catalogStats: CatalogStats;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const pendingScroll = useRef<number | null>(null);

  // Spejl af aktuel tilstand - opdateres ved HVERT render (ikke i effekter),
  // så alle gemninger altid ser de nyeste værdier.
  const stateRef = useRef({ count: visibleCount, search: searchQuery });
  stateRef.current = { count: visibleCount, search: searchQuery };

  // Gem tilstand (antal kort + søgning). Scroll-position gemmes separat.
  // NB: Der gemmes ALDRIG ved afrejse - Next.js scroller til toppen FØR unmount,
  // så en gemning dér ville fange position 0 i stedet for den reelle position.
  const saveView = () => {
    try {
      sessionStorage.setItem("rom-view", JSON.stringify(stateRef.current));
    } catch {
      // sessionStorage utilgængelig - ignorér
    }
  };

  // Genopret visningstilstand (antal "Vis flere"-klik + scroll) ved tilbage-nav.
  // SPA-tilbage-nav (samme dokument) har navigationstype "navigate"/"reload",
  // så tilbage-knappen på PDP sætter flaget "rom-returning" i stedet.
  useEffect(() => {
    let isReturning = false;
    try {
      isReturning = sessionStorage.getItem("rom-returning") === "1";
      sessionStorage.removeItem("rom-returning");
    } catch {
      // ignorér
    }
    if (!isReturning) {
      // Frisk besøg eller genindlæsning: start forfra og ryd gammel tilstand
      try {
        sessionStorage.removeItem("rom-view");
        sessionStorage.removeItem("rom-scrollY");
      } catch {
        // ignorér
      }
      return;
    }
    try {
      const raw = sessionStorage.getItem("rom-view");
      const rawScroll = sessionStorage.getItem("rom-scrollY");
      const savedScroll = rawScroll ? Number(rawScroll) : 0;
      if (raw) {
        const saved = JSON.parse(raw) as { count?: number; search?: string };
        if (typeof saved.count === "number" && saved.count > PAGE_SIZE) {
          pendingScroll.current = savedScroll > 0 ? savedScroll : null;
          setVisibleCount(saved.count);
        } else if (savedScroll > 0) {
          pendingScroll.current = savedScroll;
        }
        if (typeof saved.search === "string" && saved.search) {
          setSearchQuery(saved.search);
        }
      }
    } catch {
      // Intet gyldigt at genoprettede - start fra toppen som normalt
    }
  }, []);

  // Gem ved tilstandsændring (nye kort/ny søgning) - stateRef er altid frisk her
  useEffect(() => {
    saveView();
  }, [visibleCount, searchQuery]);

  // Gem scroll-position i KLIK-ØJEBLIKKET på et produkt-link.
  // Kontinuerlig scroll-gemning dur ikke: Next.js scroller til toppen ved
  // navigation, MENS forsiden stadig er mounted, og en scroll-lytter ville
  // da gemme 0 hen over den reelle position. Der gemmes derfor kun her.
  const saveScrollOnNavigate = (e: MouseEvent<HTMLElement>) => {
    if ((e.target as HTMLElement).closest("a")) {
      try {
        sessionStorage.setItem("rom-scrollY", String(window.scrollY));
      } catch {
        // ignorér
      }
    }
  };

  // Scroll til gemt position FØRST når kortene er renderet (dokumentet højt nok)
  useEffect(() => {
    if (pendingScroll.current === null) return;
    const target = pendingScroll.current;
    const maxWait = Date.now() + 1500;

    const attempt = () => {
      // Vent til dokumentet faktisk er højt nok til at række målet
      if (document.documentElement.scrollHeight > target + 100 || Date.now() > maxWait) {
        window.scrollTo(0, target);
        pendingScroll.current = null;
      } else {
        requestAnimationFrame(attempt);
      }
    };
    requestAnimationFrame(attempt);
  }, [visibleCount, searchQuery]);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setVisibleCount(PAGE_SIZE);
  };

  const filteredProducts = initialProducts.filter((product) => {
    const query = searchQuery.toLowerCase();
    return (
      product.name.toLowerCase().includes(query) ||
      (product.brand?.toLowerCase().includes(query) ?? false) ||
      (product.category?.toLowerCase().includes(query) ?? false)
    );
  });

  const displayedProducts = (searchQuery ? filteredProducts : initialProducts).slice(
    0,
    visibleCount,
  );
  const totalMatching = searchQuery ? filteredProducts.length : initialProducts.length;
  const remaining = totalMatching - displayedProducts.length;

  return (
    <main className="flex w-full flex-1 flex-col" onClickCapture={saveScrollOnNavigate}>
      <Hero stats={catalogStats} />
      
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 pb-10">
        {/* Sticky søgebar: følger med ved scroll, så man altid kan søge.
            -mx-4 px-4 så baggrunden dækker hele containerbredden
            (kort ville ellers skimte igennem i side-margenerne). */}
        <div className="sticky top-0 z-30 -mx-4 bg-[#FBFBF2] px-4 py-4">
          <SearchField searchQuery={searchQuery} onSearchChange={handleSearchChange} />
        </div>

        <div className={`transition-all duration-500 overflow-hidden ${searchQuery ? "max-h-0 opacity-0 mb-0" : "max-h-[500px] opacity-100 mb-6"}`}>
          {monthlyFind && <MonthlyFindModule find={monthlyFind} stats={catalogStats} />}
        </div>

        {displayedProducts.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4">
            {searchQuery
              ? `Ingen produkter fundet for "${searchQuery}"`
              : "Ingen produkter endnu. Tilføj produkter og forhandler-links via Supabase Table Editor for at komme i gang."}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {displayedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            {remaining > 0 && (
              <div className="mt-8 flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                  className="-rotate-1 rounded-[2px] bg-foreground px-6 py-3 text-sm font-medium text-background shadow-[2px_3px_0_rgba(17,17,17,0.15)] transition-transform hover:rotate-0 hover:bg-[#c2410c]"
                >
                  Vis flere rom {remaining > 0 ? `(${remaining} tilbage)` : ""}
                </button>
                <p className="text-xs text-muted-foreground">
                  Viser {displayedProducts.length} af {totalMatching} rom
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
