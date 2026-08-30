import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Produktbilleder scrapes fra forskellige danske forhandleres domæner,
    // som ikke er kendt på forhånd, så vi kan ikke liste dem enkeltvis.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
