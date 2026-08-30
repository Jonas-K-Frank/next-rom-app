import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Produktbilleder scrapes fra forskellige danske forhandleres domæner,
    // som ikke er kendt på forhånd, så vi kan ikke liste dem enkeltvis.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
    // Konverter altid til WebP ved levering, uanset kildeformat
    // (forhandlernes originalbilleder er typisk JPEG/PNG).
    formats: ["image/webp"],
  },
};

export default nextConfig;
