/**
 * AI-genererede produktbeskrivelser for next-rom-app
 * 
 * Bruger product_retailer_links.description som kilder
 * 
 * Dette script:
 * 1. Indsamler beskrivelser fra product_retailer_links
 * 2. Genererer beskrivelser via Mistral API
 * 3. Validerer med automatiske regler
 * 4. Promoverer godkendte tekster til products.description
 * 
 * Kør med:
 *   npm run generate:descriptions              # Kør for alle produkter uden description
 *   npm run generate:descriptions:rerun       # Kør kun for FAIL/NULL produkter
 *   tsx scripts/generate_descriptions.ts --rerun-failed  # Samme som ovenfor
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import * as ws from 'ws';

// Load environment variables from .env.local in project root
config({ path: path.join(__dirname, '..', '.env.local') });

// Environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("Missing Supabase configuration. Check .env.local");
    process.exit(1);
}

if (!MISTRAL_API_KEY) {
    console.error("Missing Mistral API key. Check .env.local");
    process.exit(1);
}

// Parse CLI arguments
const args = process.argv.slice(2);
const rerunFailed = args.includes('--rerun-failed') || args.includes('-r');
const regenerateAll = args.includes('--regenerate-all') || args.includes('-a');

console.log(`Running in ${regenerateAll ? 'REGENERATE ALL' : rerunFailed ? 'RE-RUN (failed/null only)' : 'FULL (all null)'} mode`);

// Mistral API settings
const MISTRAL_MODEL = "mistral-small-latest";
const MISTRAL_TEMPERATURE = 0.3;
const MISTRAL_MAX_TOKENS = 500;
const MAX_RETRIES_429 = 5;

// Danish stopwords for language detection
const danishStopwords = new Set([
    'og', 'en', 'den', 'det', 'med', 'for', 'er', 'til', 'på', 'i', 
    'at', 'der', 'som', 'har', 'de', 'et', 'for', 'fra', 'om', 'var',
    'have', 'hadde', 'vil', 'skal', 'kan', 'mud', 'til', 'af', 'over',
    'under', 'ud', 'op', 'ned', 'hvis', 'når', 'da', 'men'
]);

// Forbidden terms - using regex with word boundaries
// Removed: /\bmest\b/, /\bbedste\b/, /\bperfekt\b/ as standalone terms
const forbiddenTerms = [
    /\bkr\.?\b/i,           // kr. or kr (but not kraftfuld, krydder)
    /\bdkk\b/i,             // dkk (but not dkks)
    /\blevering\b/i,         // levering
    /\bpå lager\b/i,        // på lager
    /\bkøb\b/i,             // kjøb (but not køber)
    /\bkøb nu\b/i,          // køb nu
    /\bverdens bedste\b/i,  // verdens bedste
    /\bverdens mest\b/i,    // verdens mest
    /\bverdens størst\b/i, // verdens størst
    /\buundværlig\b/i,      // uundværlig
    /\bstørst\b/i,          // størst
    /\bbilligste\b/i,       // billigste
    /\bdyreste\b/i,         // dyreste
    /\btilbud\b/i,          // tilbud
    /\brabat\b/i,           // rabat
    /\bsalg\b/i,            // salg
    /\bprissammenligning\b/i, // prissammenligning
    /\bsammenlign\b/i        // sammenlign
];

// Type definitions
interface ProductDescription {
    productId: string;
    name: string;
    brand: string | null;
    volumeMl: number | null;
    abv: number | null;
    sources: string[];
    rawSources: Array<{ retailer: string; description: string; url: string }>;
}

interface GeneratedDescription {
    productId: string;
    productName: string;
    generatedText: string;
    status: 'PASS' | 'FAIL' | 'LLM_REVIEW';
    errorCodes: string[];
    validationDetails: Record<string, any>;
    sources?: string[];
}

interface PipelineStats {
    pass: number;
    fail: number;
    llmReview: number;
    errorCodes: Record<string, number>;
    passProducts: GeneratedDescription[];
    failProducts: GeneratedDescription[];
}

// Initialize Supabase client - using global fetch for Node.js 18
// Workaround for WebSocket issue: provide WebSocket implementation
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    global: {
        fetch: global.fetch
    },
    realtime: {
        transport: {
            WebSocket: ws
        }
    }
} as any);

// Utility functions
function hasDanishCharacters(text: string): boolean {
    return /[æøå]/i.test(text);
}

function countDanishStopwords(text: string): number {
    const textLower = text.toLowerCase();
    let count = 0;
    const stopwordsArray = Array.from(danishStopwords);
    for (const word of stopwordsArray) {
        if (textLower.includes(word)) {
            count++;
        }
    }
    return count;
}

function checkLanguage(text: string): boolean {
    return hasDanishCharacters(text) || countDanishStopwords(text) >= 5;
}

function checkLength(text: string): [boolean, string] {
    const length = text.length;
    if (140 <= length && length <= 800) {
        return [true, ""];
    }
    return [false, `LEN (${length} chars)`];
}

function extractNumbers(text: string): number[] {
    // Match numbers with decimal points or commas, and integers
    // Examples: 40, 40.5, 40,5, 70, 700
    const numberRegex = /\b\d+(?:[.,]\d+)?\b/g;
    const matches = text.match(numberRegex);
    if (!matches) return [];
    
    // Convert to numbers, replacing comma with dot for parseFloat
    return matches.map(m => {
        const normalized = m.replace(',', '.');
        return parseFloat(normalized);
    });
}

function checkCopyRights(text: string, sources: string[], productName?: string): [boolean, string] {
    // Normalize: lowercase, remove punctuation, split into words
    const normalize = (str: string): string[] => {
        return str.toLowerCase()
            .replace(/[.,;:!?"'()\[\]{}]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .split(' ')
            .filter(word => word.length > 0);
    };
    
    const textWords = normalize(text);
    const productNameWords = productName ? normalize(productName) : [];
    
    // Build an array of all product name word sequences of 2+ words
    // These will be allowed to appear in the generated text
    const productNameSequences: string[] = [];
    if (productNameWords.length >= 2) {
        for (let len = 2; len <= productNameWords.length; len++) {
            for (let i = 0; i <= productNameWords.length - len; i++) {
                const seq = productNameWords.slice(i, i + len).join(' ');
                productNameSequences.push(seq);
            }
        }
    }
    
    if (textWords.length < 6) {
        return [true, ""];
    }
    
    // Build all 6-word sequences from text, excluding those that contain product name sequences
    const textSequences = new Set<string>();
    for (let i = 0; i <= textWords.length - 6; i++) {
        const sequence = textWords.slice(i, i + 6).join(' ');
        
        // Check if this sequence contains any product name sequence of 3+ words
        let containsProductName = false;
        for (const prodSeq of productNameSequences) {
            if (sequence.includes(prodSeq + ' ') || 
                sequence.startsWith(prodSeq + ' ') ||
                sequence.endsWith(' ' + prodSeq) ||
                sequence === prodSeq) {
                containsProductName = true;
                break;
            }
        }
        
        if (!containsProductName) {
            textSequences.add(sequence);
        }
    }
    
    if (textSequences.size === 0) {
        return [true, ""];
    }
    
    // Check against all sources (also exclude product name sequences from source sequences)
    for (const source of sources) {
        const sourceWords = normalize(source);
        
        for (let i = 0; i <= sourceWords.length - 6; i++) {
            const sequence = sourceWords.slice(i, i + 6).join(' ');
            
            // Check if this sequence contains any product name sequence of 3+ words
            let containsProductName = false;
            for (const prodSeq of productNameSequences) {
                if (sequence.includes(prodSeq + ' ') || 
                    sequence.startsWith(prodSeq + ' ') ||
                    sequence.endsWith(' ' + prodSeq) ||
                    sequence === prodSeq) {
                    containsProductName = true;
                    break;
                }
            }
            
            if (!containsProductName && textSequences.has(sequence)) {
                return [false, `COPY (found 6-word sequence: "${sequence}" in source)`];
            }
        }
    }
    
    return [true, ""];
}

function checkFactTraceability(
    text: string, 
    sources: string[],
    productName?: string,
    productVolumeMl: number | null = null,
    productAbv: number | null = null
): [boolean, string] {
    const textNumbers = extractNumbers(text);
    const sourceNumbers = extractNumbers(sources.join(' '));
    
    // Add numbers from product name (e.g., "18YO", "2004/2017", "13 år")
    if (productName) {
        const productNameNumbers = extractNumbers(productName);
        sourceNumbers.push(...productNameNumbers);
    }
    
    // Add product data numbers
    if (productVolumeMl !== null) {
        sourceNumbers.push(productVolumeMl);
        // Add centiliter equivalent (700 ml = 70 cl)
        sourceNumbers.push(productVolumeMl / 10);
    }
    if (productAbv !== null) {
        sourceNumbers.push(productAbv);
    }
    
    const untraceableNumbers: number[] = [];
    for (const num of textNumbers) {
        let found = false;
        for (const sourceNum of sourceNumbers) {
            // Direct match with small tolerance for floating point
            if (Math.abs(num - sourceNum) < 0.1) {
                found = true;
                break;
            }
            // Check percentage conversions (e.g., 40 vs 0.4)
            if (Math.abs(num - sourceNum * 100) < 0.1 || Math.abs(num * 100 - sourceNum) < 0.1) {
                found = true;
                break;
            }
            // Check cl to ml conversion (e.g., 70 cl = 700 ml)
            if (Math.abs(num - sourceNum * 10) < 0.1 || Math.abs(num * 10 - sourceNum) < 0.1) {
                found = true;
                break;
            }
        }
        
        if (!found) {
            untraceableNumbers.push(num);
        }
    }
    
    if (untraceableNumbers.length > 0) {
        return [false, `FACT (untraceable numbers: ${untraceableNumbers.join(', ')})`];
    }
    
    return [true, ""];
}

function checkForbiddenTerms(text: string): [boolean, string] {
    for (const term of forbiddenTerms) {
        if (term.test(text)) {
            return [false, `BAN (found '${term.source || term.toString()}')`];
        }
    }
    
    return [true, ""];
}

function validateDescription(
    text: string,
    sources: string[],
    productVolumeMl: number | null = null,
    productAbv: number | null = null,
    productName?: string
): GeneratedDescription {
    const errorCodes: string[] = [];
    const validationDetails: Record<string, any> = {};
    
    const [lengthOk, lengthError] = checkLength(text);
    if (!lengthOk) {
        errorCodes.push(lengthError);
        validationDetails.length = { actual: text.length, expected: '200-800' };
    }
    
    const langOk = checkLanguage(text);
    if (!langOk) {
        errorCodes.push("LANG");
        validationDetails.language = 'Not Danish';
    }
    
    const [copyOk, copyError] = checkCopyRights(text, sources, productName);
    if (!copyOk) {
        errorCodes.push(copyError);
        validationDetails.copy = copyError;
    }
    
    const [factOk, factError] = checkFactTraceability(text, sources, productName, productVolumeMl, productAbv);
    if (!factOk) {
        errorCodes.push(factError);
        validationDetails.fact_traceability = factError;
    }
    
    const [forbiddenOk, forbiddenError] = checkForbiddenTerms(text);
    if (!forbiddenOk) {
        errorCodes.push(forbiddenError);
        validationDetails.forbidden_terms = forbiddenError;
    }
    
    let status: 'PASS' | 'FAIL' | 'LLM_REVIEW' = 'PASS';
    if (errorCodes.length > 0) {
        if (errorCodes.some(code => code.includes('FACT'))) {
            status = 'LLM_REVIEW';
        } else {
            status = 'FAIL';
        }
    }
    
    return {
        productId: "",
        productName: "",
        generatedText: text,
        status,
        errorCodes,
        validationDetails,
        sources
    };
}

// Mistral API client
async function callMistralAPI(systemPrompt: string, userPrompt: string, retryCount: number = 0): Promise<string | null> {
    const apiUrl = "https://api.mistral.ai/v1/chat/completions";
    
    const payload = {
        model: MISTRAL_MODEL,
        temperature: MISTRAL_TEMPERATURE,
        max_tokens: MISTRAL_MAX_TOKENS,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ]
    };
    
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${MISTRAL_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (response.status === 200) {
            const data = await response.json();
            // Normalize newlines to spaces, then trim
            return data.choices[0].message.content.replace(/\r?\n/g, ' ').trim();
        } else if (response.status === 429) {
            // Rate limited - retry with max of 5 attempts
            if (retryCount >= MAX_RETRIES_429) {
                console.error(`Rate limited after ${MAX_RETRIES_429} retries`);
                return null;
            }
            const retryAfter = response.headers.get('retry-after') || '10';
            console.warn(`Rate limited, retry ${retryCount + 1}/${MAX_RETRIES_429} after ${retryAfter}s`);
            await new Promise(resolve => setTimeout(resolve, parseInt(retryAfter) * 1000));
            return callMistralAPI(systemPrompt, userPrompt, retryCount + 1);
        } else {
            const errorData = await response.json();
            console.error(`Mistral API error: ${response.status} - ${JSON.stringify(errorData)}`);
            return null;
        }
    } catch (error) {
        console.error(`Exception calling Mistral API: ${error}`);
        return null;
    }
}

async function generateDescription(product: ProductDescription): Promise<string | null> {
    // Load system prompt
    const promptPath = path.join(__dirname, 'description_prompt.md');
    let systemPrompt = fs.readFileSync(promptPath, 'utf-8').trim();
    
    // Build user prompt
    const sourcesText = product.sources.join('\n---\n');
    
    const userPrompt = `Produktnavn: ${product.name}
Brand: ${product.brand || 'Ukendt'}
Volumen: ${product.volumeMl || 'Ukendt'} ml
ABV: ${product.abv || 'Ukendt'} %

Kilder:
${sourcesText}`;
    
    return callMistralAPI(systemPrompt, userPrompt);
}

// Database operations
async function fetchProductsWithoutGeneratedDescription(): Promise<ProductDescription[]> {
    console.log(`Fetching products (rerun mode: ${rerunFailed}, regenerate all: ${regenerateAll})...`);
    
    // Build the filter based on mode
    let query = supabase
        .from('products')
        .select('id, name, brand, volume_ml, abv, description, description_status');
    
    if (regenerateAll) {
        // Regenerate ALL mode: get all products with generated descriptions
        query = query.eq('description_source', 'generated');
    } else if (rerunFailed) {
        // Re-run mode: description IS NULL OR description_status != 'PASS'
        query = query.or('description.is.null,description_status.neq.PASS');
    } else {
        // Normal mode: description IS NULL
        query = query.is('description', null);
    }
    
    const { data: products, error: productsError } = await query.limit(5000);
    
    if (productsError || !products) {
        console.error('Error fetching products:', productsError);
        return [];
    }
    
    console.log(`Found ${products.length} products without PASS descriptions`);
    
    // For each product, get descriptions from product_retailer_links
    const productDescriptions: ProductDescription[] = [];
    
    for (const product of products) {
        const { data: links, error: linksError } = await supabase
            .from('product_retailer_links')
            .select('description, product_url')
            .eq('product_id', product.id)
            .not('description', 'is', null);
        
        if (linksError) {
            console.error(`Error fetching links for product ${product.id}:`, linksError);
            continue;
        }
        
        // Filter in JS: only descriptions longer than 40 chars
        const validLinks = (links || []).filter(l => l.description && l.description.length > 40);
        
        if (validLinks.length > 0) {
            productDescriptions.push({
                productId: product.id,
                name: product.name,
                brand: product.brand,
                volumeMl: product.volume_ml,
                abv: product.abv,
                sources: validLinks.map(l => l.description),
                rawSources: validLinks.map(l => ({
                    retailer: 'unknown',
                    description: l.description,
                    url: l.product_url || ''
                }))
            });
        }
    }
    
    console.log(`Found ${productDescriptions.length} products with source descriptions`);
    return productDescriptions;
}

async function updateProductDescription(
    productId: string,
    description: string | null,
    descriptionSource: string | null = 'generated',
    descriptionGenerated: any = null,
    descriptionStatus: string = 'PASS'
): Promise<boolean> {
    const { error } = await supabase
        .from('products')
        .update({
            description,
            description_source: descriptionSource,
            description_generated: descriptionGenerated,
            description_status: descriptionStatus
        })
        .eq('id', productId);
    
    if (error) {
        console.error(`Error updating product ${productId}:`, error);
        return false;
    }
    
    console.log(`Updated product ${productId}`);
    return true;
}

// Main pipeline
async function collectDescriptions(): Promise<ProductDescription[]> {
    console.log("Starting description collection...");
    
    // Get products without generated descriptions
    const products = await fetchProductsWithoutGeneratedDescription();
    
    return products;
}

async function generateForProducts(
    products: ProductDescription[]
): Promise<Record<string, GeneratedDescription>> {
    console.log(`Generating descriptions for ${products.length} products...`);
    
    const results: Record<string, GeneratedDescription> = {};
    
    // Generate in batches of 4 to respect rate limiting
    const batchSize = 4;
    
    for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize);
        console.log(`Processing batch ${i / batchSize + 1} (${batch.length} products)...`);
        
        // Process batch with parallel generation
        const promises = batch.map(async (product) => {
            let retries = 0;
            const maxRetries = 3;
            let description: string | null = null;
            
            while (retries < maxRetries && !description) {
                try {
                    description = await generateDescription(product);
                    if (!description) {
                        retries++;
                        if (retries < maxRetries) {
                            await new Promise(resolve => setTimeout(resolve, 1000 * (2 ** retries)));
                        }
                    }
                } catch (err) {
                    console.error(`Error generating for ${product.name}:`, err);
                    retries++;
                    if (retries < maxRetries) {
                        await new Promise(resolve => setTimeout(resolve, 1000 * (2 ** retries)));
                    }
                }
            }
            
            return { product, description };
        });
        
        const batchResults = await Promise.all(promises);
        
        for (const { product, description } of batchResults) {
            const pid = product.productId;
            
            if (description) {
                const validation = validateDescription(
                    description,
                    product.sources,
                    product.volumeMl,
                    product.abv,
                    product.name
                );
                validation.productId = pid;
                validation.productName = product.name;
                validation.generatedText = description;
                
                results[pid] = validation;
            } else {
                results[pid] = {
                    productId: pid,
                    productName: product.name,
                    generatedText: "",
                    status: 'FAIL',
                    errorCodes: ["GEN_ERROR"],
                    validationDetails: { error: "Generation failed" },
                    sources: []
                };
            }
        }
        
        // Rate limiting between batches
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return results;
}

async function handleLLMReview(
    reviewsNeeded: GeneratedDescription[],
    products: ProductDescription[]
): Promise<GeneratedDescription[]> {
    const reviewed: GeneratedDescription[] = [];
    
    for (const desc of reviewsNeeded) {
        const product = products.find(p => p.productId === desc.productId);
        if (!product) continue;
        
        // Use checkFactTraceability for fact checking (handles cl->ml conversion)
        const [factOk, factError] = checkFactTraceability(
            desc.generatedText,
            product.sources,
            product.name,
            product.volumeMl,
            product.abv
        );
        
        const violations: string[] = [];
        if (!factOk) {
            violations.push(factError);
        }
        
        // Check for forbidden terms using regex test
        for (const term of forbiddenTerms) {
            if (term.test(desc.generatedText)) {
                violations.push(`Forbidden term: ${term.source || term.toString()}`);
            }
        }
        
        if (violations.length > 0) {
            desc.status = 'FAIL';
            desc.errorCodes = violations;
            desc.validationDetails.llm_review = { ok: false, reason: 'Factual errors found', violations };
        } else {
            desc.status = 'PASS';
            desc.errorCodes = [];
            desc.validationDetails.llm_review = 'OK';
        }
        
        reviewed.push(desc);
    }
    
    return reviewed;
}

async function promoteDescriptions(
    results: Record<string, GeneratedDescription>
): Promise<PipelineStats> {
    const stats: PipelineStats = {
        pass: 0,
        fail: 0,
        llmReview: 0,
        errorCodes: {},
        passProducts: [],
        failProducts: []
    };
    
    for (const [pid, result] of Object.entries(results)) {
        // Count error codes
        for (const code of result.errorCodes) {
            stats.errorCodes[code] = (stats.errorCodes[code] || 0) + 1;
        }
        
        if (result.status === 'PASS') {
            stats.pass++;
            stats.passProducts.push(result);
            
            await updateProductDescription(
                pid,
                result.generatedText,
                'generated',
                JSON.stringify({
                    original_text: result.generatedText,
                    sources_count: result.sources?.length || 0,
                    generated_at: new Date().toISOString()
                }),
                'PASS'
            );
        } else if (result.status === 'LLM_REVIEW') {
            stats.llmReview++;
        } else {
            stats.fail++;
            stats.failProducts.push(result);
            
            await updateProductDescription(
                pid,
                null,
                null,
                JSON.stringify({
                    failed_text: result.generatedText,
                    error_codes: result.errorCodes,
                    validation: result.validationDetails,
                    generated_at: new Date().toISOString()
                }),
                `FAIL:${result.errorCodes.join(',')}`
            );
        }
    }
    
    return stats;
}

async function generateReport(stats: PipelineStats): Promise<void> {
    console.log("\n" + "=".repeat(60));
    console.log("DESCRIPTION GENERATION REPORT");
    console.log("=".repeat(60));
    
    const total = stats.passProducts.length + stats.failProducts.length;
    console.log(`\nTotal products processed: ${total}`);
    console.log(`PASS: ${stats.pass}`);
    console.log(`FAIL: ${stats.fail}`);
    console.log(`LLM_REVIEW: ${stats.llmReview}`);
    
    console.log(`\nError codes distribution:`);
    const sortedCodes = Object.entries(stats.errorCodes)
        .sort((a, b) => b[1] - a[1]);
    for (const [code, count] of sortedCodes) {
        console.log(`  ${code}: ${count}`);
    }
    
    console.log(`\nFailed products (first 20):`);
    for (let i = 0; i < Math.min(20, stats.failProducts.length); i++) {
        const product = stats.failProducts[i];
        console.log(`  ${i + 1}. ${product.productName} (${product.productId})`);
        console.log(`     Errors: ${product.errorCodes.join(', ')}`);
    }
    
    if (stats.failProducts.length > 20) {
        console.log(`     ... and ${stats.failProducts.length - 20} more`);
    }
    
    console.log(`\nSample PASS descriptions (first 20):`);
    for (let i = 0; i < Math.min(20, stats.passProducts.length); i++) {
        const product = stats.passProducts[i];
        console.log(`\n  ${i + 1}. ${product.productName}`);
        console.log(`     ${product.generatedText}`);
    }
    
    console.log("\n" + "=".repeat(60));
    
    // Also write to file
    let report = "DESCRIPTION GENERATION REPORT\n";
    report += "=".repeat(60) + "\n\n";
    report += `Generated at: ${new Date().toISOString()}\n`;
    report += `Mode: ${rerunFailed ? "RE-RUN (failed/null)" : "FULL (all null)"}\n\n`;
    report += `Total products processed: ${total}\n`;
    report += `PASS: ${stats.pass}\n`;
    report += `FAIL: ${stats.fail}\n`;
    report += `LLM_REVIEW: ${stats.llmReview}\n\n`;
    
    report += "Error codes distribution:\n";
    for (const [code, count] of sortedCodes) {
        report += `  ${code}: ${count}\n`;
    }
    
    report += "\nFailed products:\n";
    for (const product of stats.failProducts) {
        report += `  - ${product.productName} (${product.productId})\n`;
        report += `    Errors: ${product.errorCodes.join(', ')}\n`;
    }
    
    report += "\nSample PASS descriptions:\n";
    for (const product of stats.passProducts.slice(0, 20)) {
        report += `\n${product.productName}\n`;
        report += `${product.generatedText}\n`;
    }
    
    fs.writeFileSync('scripts/generation_report.txt', report, 'utf-8');
}

// Main function
async function main() {
    console.log("Starting description generation pipeline...");
    console.log(`Mode: ${regenerateAll ? 'REGENERATE ALL' : rerunFailed ? 'RE-RUN (failed/null only)' : 'FULL (all null)'}\n`);
    
    // Trin 1: Indsaml
    const products = await collectDescriptions();
    
    if (products.length === 0) {
        console.info("No products with source descriptions found. Exiting.");
        return;
    }
    
    // Trin 2-3: Generer og valider
    const results = await generateForProducts(products);
    
    // Trin 4: LLM-review for LLM_REVIEW
    const llmReviewNeeded = Object.values(results).filter(r => r.status === 'LLM_REVIEW');
    if (llmReviewNeeded.length > 0) {
        console.info(`Processing ${llmReviewNeeded.length} LLM reviews...`);
        const reviewed = await handleLLMReview(llmReviewNeeded, products);
        for (const r of reviewed) {
            results[r.productId] = r;
        }
    }
    
    // Trin 5: Promover
    const stats = await promoteDescriptions(results);
    
    // Trin 6: Rapport
    await generateReport(stats);
    
    console.log("Pipeline completed!");
}

// Run main
main().catch(err => {
    console.error("Pipeline failed:", err);
    process.exit(1);
});
