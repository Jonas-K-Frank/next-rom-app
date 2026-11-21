import type { MetadataRoute } from "next";

// robots.txt: AFVIS alle crawlers indtil det rigtige domæne er koblet på.
// Test-URLen (vercel.app) skal ikke indekseres, ellers hænger Google fast
// i en adresse vi senere flytter fra.
//
// NÅR DOMÆNET ER KLART:
// 1) Skift rules her tilbage til { userAgent: "*", allow: "/" }
// 2) Sæt NEXT_PUBLIC_SITE_URL til domænet i Vercel-mileuet
// 3) Indsend sitemapet i Google Search Console

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
