/**
 * Check database setup for description generation
 * 
 * Verificerer:
 * 1. At products-tabellen har de nødvendige kolonner
 * 2. At product_retailer_links har description kolonne
 * 3. Tæller beskrivelser i product_retailer_links
 * 
 * Kør med: npm run check:db
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';

// Load environment variables from .env.local in project root
config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("Missing Supabase configuration. Check .env.local");
    process.exit(1);
}

// Initialize Supabase client (Node 22 har indbygget WebSocket; realtime bruges ikke her)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    db: { schema: 'public' }
});

async function checkProductsTable() {
    console.log("Checking products table...\n");
    
    const requiredColumns = ['description', 'description_source', 'description_generated', 'description_status'];
    
    const results: Record<string, boolean> = {};
    
    // Check all columns at once by trying to select them
    try {
        const { data, error } = await supabase
            .from('products')
            .select(requiredColumns.join(', '))
            .limit(1);
        
        if (error) {
            // If error, check which columns are missing
            const missingColumns = error.message.match(/column "products\.(\w+)" does not exist/g);
            if (missingColumns) {
                const missing = missingColumns.map((m: string) => m.replace(/column "products\./, '').replace(/"/, ''));
                for (const col of requiredColumns) {
                    results[col] = !missing.includes(col);
                    console.log(`${results[col] ? '✓' : '✗'} ${col}: ${results[col] ? 'exists' : 'MISSING'}`);
                }
            } else {
                for (const col of requiredColumns) {
                    results[col] = false;
                    console.log(`✗ ${col}: ERROR - ${error.message}`);
                }
            }
        } else {
            for (const col of requiredColumns) {
                results[col] = true;
                console.log(`✓ ${col}: exists`);
            }
        }
    } catch (err) {
        for (const col of requiredColumns) {
            results[col] = false;
            console.log(`✗ ${col}: ERROR - ${err}`);
        }
    }
    
    // Count products
    try {
        const { count, error } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true });
        
        console.log(`\nProducts table: ${count || 0} total products`);
        
        // Count with/without descriptions
        const { count: withDesc } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .not('description', 'is', null);
        
        const { count: withoutDesc } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .is('description', null);
        
        console.log(`  - With generated description: ${withDesc || 0}`);
        console.log(`  - Without generated description: ${withoutDesc || 0}`);
    } catch (err) {
        console.log(`\nError counting products: ${err}`);
    }
    
    return results;
}

async function checkProductRetailerLinks() {
    console.log("\nChecking product_retailer_links table...\n");
    
    const requiredColumns = ['product_url', 'description'];
    const results: Record<string, boolean> = {};
    
    // Check all columns at once by trying to select them
    try {
        const { data, error } = await supabase
            .from('product_retailer_links')
            .select(requiredColumns.join(', '))
            .limit(1);
        
        if (error) {
            // If error, check which columns are missing
            const missingColumns = error.message.match(/column "product_retailer_links\.(\w+)" does not exist/g);
            if (missingColumns) {
                const missing = missingColumns.map((m: string) => m.replace(/column "product_retailer_links\./, '').replace(/"/, ''));
                for (const col of requiredColumns) {
                    results[col] = !missing.includes(col);
                    console.log(`${results[col] ? '✓' : '✗'} ${col}: ${results[col] ? 'exists' : 'MISSING'}`);
                }
            } else {
                for (const col of requiredColumns) {
                    results[col] = false;
                    console.log(`✗ ${col}: ERROR - ${error.message}`);
                }
            }
        } else {
            for (const col of requiredColumns) {
                results[col] = true;
                console.log(`✓ ${col}: exists`);
            }
        }
    } catch (err) {
        for (const col of requiredColumns) {
            results[col] = false;
            console.log(`✗ ${col}: ERROR - ${err}`);
        }
    }
    
    // Count rows with descriptions
    try {
        const { count, error } = await supabase
            .from('product_retailer_links')
            .select('*', { count: 'exact', head: true });
        
        console.log(`\nTotal rows: ${count || 0}`);
        
        const { count: withDesc } = await supabase
            .from('product_retailer_links')
            .select('*', { count: 'exact', head: true })
            .not('description', 'is', null);
        
        const { count: withLongDesc } = await supabase
            .from('product_retailer_links')
            .select('*', { count: 'exact', head: true })
            .not('description', 'is', null)
            .gt('description', 40);
        
        console.log(`  - With description: ${withDesc || 0}`);
        console.log(`  - With description > 40 chars: ${withLongDesc || 0}`);
        
        // Count unique products with descriptions
        const { count: uniqueProducts } = await supabase.rpc(`
            select count(distinct product_id) 
            from product_retailer_links 
            where description is not null and length(description) > 40
        `);
        
        console.log(`  - Unique products with source descriptions: ${uniqueProducts || 0}`);
        
        // Count products with multiple descriptions
        const { data: multiDesc } = await supabase.rpc(`
            select count(*) 
            from (
                select product_id, count(*) as cnt
                from product_retailer_links 
                where description is not null and length(description) > 40
                group by product_id
                having count(*) > 1
            ) t
        `);
        
        console.log(`  - Products with multiple source descriptions: ${multiDesc?.[0]?.count || 0}`);
    } catch (err) {
        console.log(`\nError counting links: ${err}`);
    }
    
    return results;
}

async function checkStagingTables() {
    console.log("\nChecking for staging tables...\n");
    
    const stagingTables = [
        'stg_juuls_dk', 'stg_kokkens_dk', 'stg_hj_hansen_dk', 
        'stg_vin_med_mere_dk', 'stg_uhrskov_dk'
    ];
    
    const results: Record<string, { exists: boolean; rowCount: number; hasDescription: boolean }> = {};
    
    for (const table of stagingTables) {
        try {
            const { data, error } = await supabase
                .from('information_schema.tables')
                .select('table_name')
                .eq('table_name', table)
                .single();
            
            const exists = !!data;
            
            if (exists) {
                const { count } = await supabase
                    .from(table)
                    .select('*', { count: 'exact', head: true });
                
                const { data: columns } = await supabase
                    .from('information_schema.columns')
                    .select('column_name')
                    .eq('table_name', table)
                    .eq('column_name', 'description');
                
                results[table] = {
                    exists: true,
                    rowCount: count || 0,
                    hasDescription: (columns?.length ?? 0) > 0
                };
                
                console.log(`✓ ${table}: ${count || 0} rows, ${results[table].hasDescription ? 'has' : 'no'} description column`);
            } else {
                results[table] = {
                    exists: false,
                    rowCount: 0,
                    hasDescription: false
                };
                console.log(`✗ ${table}: NOT FOUND`);
            }
        } catch (err) {
            results[table] = {
                exists: false,
                rowCount: 0,
                hasDescription: false
            };
            console.log(`✗ ${table}: ERROR - ${err}`);
        }
    }
    
    return results;
}

async function main() {
    console.log("=".repeat(60));
    console.log("DATABASE CHECK FOR DESCRIPTION GENERATION");
    console.log("=".repeat(60) + "\n");
    
    // Run checks
    const productsTable = await checkProductsTable();
    const linksTable = await checkProductRetailerLinks();
    const stagingTables = await checkStagingTables();
    
    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("SUMMARY");
    console.log("=".repeat(60));
    
    const allRequiredColumns = Object.values(productsTable).every(v => v);
    const allLinkColumns = Object.values(linksTable).every(v => v);
    
    const stagingWithDescriptions = Object.values(stagingTables)
        .filter(t => t.exists && t.hasDescription).length;
    
    console.log(`\nProducts table ready: ${allRequiredColumns ? 'YES ✓' : 'NO ✗'}`);
    console.log(`Product-retailer links ready: ${allLinkColumns ? 'YES ✓' : 'NO ✗'}`);
    console.log(`Staging tables with descriptions: ${stagingWithDescriptions}`);
    
    if (!allRequiredColumns) {
        console.log("\n⚠ WARNING: Products table is missing required columns!");
        console.log("Run the migration: supabase/migrations/20261113_add_product_descriptions.sql");
    }
    
    if (!allLinkColumns) {
        console.log("\n⚠ WARNING: Product-retailer links is missing required columns!");
    }
    
    if (stagingWithDescriptions > 0) {
        console.log("\n✓ Staging tables found - script can use either staging tables or product_retailer_links");
    } else {
        console.log("\n✓ Using product_retailer_links.description as source");
    }
    
    console.log("\n" + "=".repeat(60));
}

main().catch(err => {
    console.error("Check failed:", err);
    process.exit(1);
});
