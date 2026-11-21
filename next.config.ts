import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Produktbilleder scrapes fra forskellige danske forhandleres domæner,
    // som ikke er kendt på forhånd, så vi kan ikke liste dem enkeltvis.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
    // AVIF først (mindste filer, bred browserunderstøttelse), WebP som fallback.
    formats: ["image/avif", "image/webp"],
    // Produktfotos har begrænset detaljerigdom (flasker mod hvid baggrund),
    // så kvalitet 70 er nok og sparer markant i filstørrelse.
    // NB: Next.js 16 kræver qualities-allowlist; selve kvaliteten
    // sættes som quality-prop på de enkelte <Image>-komponenter.
    qualities: [70],
    // Forhandlerbilleder ændrer sig sjældent - lad CDN'et cache dem længe
    // (31 dage), så optimizeren ikke skal transformere samme kilde igen.
    minimumCacheTTL: 2678400,
  },
};

export default nextConfig;
