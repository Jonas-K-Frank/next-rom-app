/**
 * generate_countries.ts
 * Udleder oprindelsesland for hvert produkt via Mistral (navn + beskrivelse)
 * og gemmer checkpoint-pr. batch i products.country.
 *
 * Kørsel: npm run generate:countries   (kun produkter hvor country IS NULL)
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import * as path from 'path';

config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !MISTRAL_API_KEY) {
    console.error("Missing configuration. Check .env.local");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const MISTRAL_MODEL = "mistral-small-latest";
const BATCH_SIZE = 25;        // produkter pr. LLM-kald
const MAX_RETRIES = 4;

type Row = { id: string; name: string; description: string | null };

async function callMistral(batch: Row[]): Promise<Record<string, string | null>> {
    const listing = batch
        .map((p, i) => `${i + 1}. ${p.name}${p.description ? ` — ${p.description.slice(0, 300)}` : ""}`)
        .join("\n");

    const prompt = `Du får en liste med rom-produkter. For hvert produkt skal du udlede rommens oprindelsesland (destilleriets land, ikke forhandlerens).

Svar KUN med gyldig JSON: et objekt hvor nøglen er produktets nummer (som streng, fx "1") og værdien er landet på dansk (fx "Guatemala", "Jamaica", "Filippinerne"). Hvis landet ikke kan udledes med rimelig sikkerhed, brug null.

${listing}`;

    let lastError: unknown = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${MISTRAL_API_KEY}`,
                },
                body: JSON.stringify({
                    model: MISTRAL_MODEL,
                    temperature: 0.1,
                    max_tokens: 1500,
                    response_format: { type: "json_object" },
                    messages: [{ role: "user", content: prompt }],
                }),
            });
            if (!res.ok) throw new Error(`Mistral API ${res.status}: ${await res.text()}`);
            const data = await res.json();
            const content = data.choices?.[0]?.message?.content ?? "{}";
            const parsed = JSON.parse(content) as Record<string, string | null>;
            return parsed;
        } catch (err) {
            lastError = err;
            const wait = attempt * 10;
            console.log(`  API-fejl (forsøg ${attempt}/${MAX_RETRIES}), venter ${wait}s: ${String(err)}`);
            await new Promise((r) => setTimeout(r, wait * 1000));
        }
    }
    throw lastError;
}

async function main() {
    console.log("Starting country generation pipeline...");

    // Supabase returnerer maks 1000 rækker pr. kald - hent med paginering
    const PAGE = 1000;
    const products: Row[] = [];
    for (let from = 0; ; from += PAGE) {
        const { data: pageRows, error: pageError } = await supabase
            .from("products")
            .select("id, name, description")
            .is("country", null)
            .order("id")
            .range(from, from + PAGE - 1);
        if (pageError) throw pageError;
        products.push(...(pageRows as Row[]));
        if (!pageRows || pageRows.length < PAGE) break;
    }
    console.log(`Products without country: ${products.length}`);

    let updated = 0;
    let skipped = 0;
    const failures: string[] = [];

    for (let i = 0; i < products.length; i += BATCH_SIZE) {
        const batch = products.slice(i, i + BATCH_SIZE) as Row[];
        console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} products)...`);

        let answers: Record<string, string | null> = {};
        try {
            answers = await callMistral(batch);
        } catch {
            console.log("  Batch fejlede helt, springer over");
            batch.forEach((p) => failures.push(p.id));
            continue;
        }

        for (let j = 0; j < batch.length; j++) {
            const country = answers[String(j + 1)];
            if (country && typeof country === "string" && country.trim().length > 0) {
                await supabase
                    .from("products")
                    .update({ country: country.trim() })
                    .eq("id", batch[j].id);
                updated++;
            } else {
                skipped++;
            }
        }
    }

    console.log("\nCOUNTRY GENERATION COMPLETE");
    console.log(`Updated: ${updated}`);
    console.log(`Skipped (ukendt land): ${skipped}`);
    console.log(`Failed batches (products): ${failures.length}`);
}

main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
