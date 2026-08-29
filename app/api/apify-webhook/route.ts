import { NextResponse } from "next/server";

// Modtager webhook-kald fra Apify når en scraping-run er færdig.
//
// TODO (separat step):
// - Verificér requestet, fx via et delt hemmeligt token i en header eller
//   query-param (se APIFY_WEBHOOK_SECRET i .env.example) og/eller Apify's
//   egen webhook-signatur.
// - Hent det faktiske scraping-resultat (payload indeholder typisk et
//   dataset-id, ikke selve prisdataen) via Apify's API.
// - Match hvert scraped produkt til et eksisterende product_retailer_links
//   via external_id/product_url.
// - Indsæt en ny række i `prices` pr. matchet link (append-only — aldrig
//   update), med `price`, `in_stock` og `scraped_at`.
export async function POST(request: Request) {
  const payload = await request.json();

  console.log("Modtog Apify-webhook:", JSON.stringify(payload, null, 2));

  return NextResponse.json({ received: true });
}
