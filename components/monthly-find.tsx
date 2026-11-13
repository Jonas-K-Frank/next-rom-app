import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { CatalogStats, MonthlyFind } from "@/lib/data/products";

const priceFormatter = new Intl.NumberFormat("da-DK", {
  style: "currency",
  currency: "DKK",
});

/** Blyantstreg-ramme: håndtegnet kant med lette overskridelser og varierende tryk */
function PencilFrame() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 300 200"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 z-0 h-full w-full"
      fill="none"
      stroke="#262626"
      strokeLinecap="round"
      vectorEffect="non-scaling-stroke"
    >
      {/* Hvidt fyld, præcis indenfor blyantstregen. Samme path som
          hovedstregen (med Z til lukning) — fordi fyld og streg har
          identisk kontur, bølger den hvide flade med stregen, og
          produktbilledets hvide baggrund falder i med kortets indre.
          FYLDET må ikke have opacity — ellers bliver det hvide indre
          let gennemsigtigt. */}
      <path
        d="M11 6 C40 4.5, 90 6.5, 150 5.5 C205 4.7, 258 6.2, 293 5.8 C295.2 5.8, 296 6.8, 295.8 8.5 C294.5 25, 295.8 40, 294.8 60 C293.8 85, 295.2 110, 294.4 135 C294.2 152, 295 170, 294.6 193 C294.5 195.5, 293.5 196.5, 291 196.3 C265 194.5, 240 196, 215 195.2 C185 194.3, 160 196, 135 195.4 C105 194.6, 75 196, 45 195.3 C25 194.8, 12 195.5, 6.8 194.9 C4.6 194.6, 3.8 193.6, 3.9 191.4 C4.4 175, 3.6 160, 4.2 142 C5 118, 3.8 95, 4.4 70 C4.9 50, 4 30, 4.4 10.5 C4.5 8, 5.5 7, 7.8 6.8 Z"
        fill="#fff"
        stroke="none"
      />
      {/* Hovedstreg med lette hjørne-overskridelser, som en hurtig
          håndtegnning i to tempi. Lidt mere kød end grafit-stregerne,
          så der stadig er et "hovedtryk" i stregen. */}
      <path
        d="M11 6 C40 4.5, 90 6.5, 150 5.5 C205 4.7, 258 6.2, 293 5.8 C295.2 5.8, 296 6.8, 295.8 8.5 C294.5 25, 295.8 40, 294.8 60 C293.8 85, 295.2 110, 294.4 135 C294.2 152, 295 170, 294.6 193 C294.5 195.5, 293.5 196.5, 291 196.3 C265 194.5, 240 196, 215 195.2 C185 194.3, 160 196, 135 195.4 C105 194.6, 75 196, 45 195.3 C25 194.8, 12 195.5, 6.8 194.9 C4.6 194.6, 3.8 193.6, 3.9 191.4 C4.4 175, 3.6 160, 4.2 142 C5 118, 3.8 95, 4.4 70 C4.9 50, 4 30, 4.4 10.5 C4.5 8, 5.5 7, 7.8 6.8"
        strokeWidth="1"
        opacity="0.55"
      />
      {/* Tynde grafit-streger ovenpå, let forskudte: giver det kornede,
          varierende tryk som en rigtig blyant. */}
      <path
        d="M12 5 C50 4, 100 6, 150 5 C205 4, 260 6, 296 5"
        strokeWidth="0.8"
        opacity="0.3"
      />
      <path
        d="M295 8 C294 40, 296 80, 295 120 C294.5 155, 295.5 175, 295 195"
        strokeWidth="0.8"
        opacity="0.3"
      />
      <path
        d="M293 195 C255 196.5, 210 194.8, 160 195.5 C120 196, 70 194.6, 5 195"
        strokeWidth="0.8"
        opacity="0.3"
      />
      <path
        d="M4 192 C3.6 160, 4.8 120, 4 80 C3.5 55, 4.4 25, 4.5 8"
        strokeWidth="0.8"
        opacity="0.3"
      />
    </svg>
  );
}

/* Diskrete skattekort-detaljer i sort streg — kompas og prikket rute.
   Bevidst tonet ned, så de dekorerer uden at råbe. */
function Decorations() {
  return (
    <>
      {/* Kompas-rose, nederst til venstre */}
      <svg
        aria-hidden="true"
        viewBox="0 0 60 60"
        className="pointer-events-none absolute bottom-2.5 left-4 z-0 h-14 w-14 opacity-50 max-sm:hidden"
        fill="none"
        stroke="#111"
        strokeWidth="1.4"
      >
        <circle cx="30" cy="30" r="24" />
        <circle cx="30" cy="30" r="18" strokeWidth="1" />
        <path d="M30 6 L33 27 L30 30 L27 27 Z" fill="#111" stroke="none" />
        <path d="M30 54 L33 33 L30 30 L27 33 Z" fill="#111" stroke="none" />
        <path
          d="M6 30 L27 27 L30 30 L27 33 Z"
          fill="#111"
          stroke="none"
          opacity="0.55"
        />
        <path
          d="M54 30 L33 27 L30 30 L33 33 Z"
          fill="#111"
          stroke="none"
          opacity="0.55"
        />
      </svg>

      {/* Prikket rute hen over kortet */}
      <svg
        aria-hidden="true"
        viewBox="0 0 900 420"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-45"
        fill="none"
        stroke="#111"
        strokeWidth="1.8"
        strokeLinecap="round"
      >
        <path
          d="M60 350 C 180 300, 240 320, 330 270 C 400 232, 480 250, 560 200"
          strokeDasharray="2 10"
        />
        <path d="M60 350 l -8 -14 m 8 14 l -15 5" />
      </svg>
    </>
  );
}

export function MonthlyFindModule({
  find,
  stats,
}: {
  find: MonthlyFind;
  stats: CatalogStats;
}) {
  return (
    <div>
      {/* Hvidt kort med blyantstreg-ramme: #FBFBF2 falder i med
          sidebaggrunden udenfor, PencilFrame tegner hvidt indre +
          stregen. p-6 på mobil så indholdet ikke står i kanten. */}
      <div className="relative -rotate-[0.5deg] rounded-lg bg-[#FBFBF2] p-6 sm:p-10">
        <PencilFrame />
        <Decorations />

        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1 sm:ml-[100px]">
            {/* Roteret stempel-mærkat i orange — sidens accentfarve,
                genbruges af prisen og hover-tilstande. */}
            <span className="inline-block -rotate-3 rounded-[3px] border-[2.5px] border-[#c2410c] px-4 py-1 text-[13px] font-bold tracking-[4px] text-[#c2410c] uppercase">
              Månedens fund
            </span>
            <h2 className="mt-3 text-xl sm:text-2xl font-semibold text-foreground">
              {find.name}
            </h2>
            <p className="mt-1 text-sm italic text-muted-foreground">
              {find.editorialLine}
            </p>
            <p className="mt-3 text-3xl sm:text-[40px] leading-none font-bold text-[#c2410c]">
              {priceFormatter.format(find.lowestPrice)}
            </p>

            {/* Centreret på mobil, venstrestillet under prisen på desktop.
                Linker til produktsiden (prishistorik + alle forhandlere),
                ikke direkte til én forhandler — det ville modsige
                sammenligningen. */}
            <div className="mt-6 flex justify-center sm:justify-start">
              <Button
                variant="default"
                nativeButton={false}
                className="-rotate-1 h-11 rounded-[2px] bg-foreground px-5 text-sm sm:h-12 sm:px-7 sm:text-base font-medium text-background shadow-[2px_3px_0_rgba(17,17,17,0.15)] hover:bg-[#c2410c]"
                render={
                  <Link href={`/produkt/${find.productId}`}>
                    Se månedens fund
                  </Link>
                }
              />
            </div>
          </div>

          {/* Produktbillede uden ramme, let roteret. object-contain —
              IKKE cover, ellers beskæres flasken. Kun på desktop; på
              mobil er der ikke plads uden at teksten trænges. */}
          {find.imageUrl && (
            <div className="hidden shrink-0 sm:flex sm:items-center sm:justify-end">
              <div className="relative h-[300px] w-[300px] rotate-[1.5deg]">
                <Image
                  src={find.imageUrl}
                  alt={find.name}
                  fill
                  className="object-contain"
                  sizes="300px"
                />
              </div>
            </div>
          )}
        </div>
      </div>
      <p className="mt-2 mb-6 text-xs text-muted-foreground">
        {stats.productCount}{" "}
        {stats.productCount === 1 ? "romprodukt" : "romprodukter"} fundet på
        tværs af {stats.retailerCount} danske forhandlere
      </p>
    </div>
  );
}