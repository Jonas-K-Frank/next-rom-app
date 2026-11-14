# AI-genererede produktbeskrivelser

Dette script genererer neutrale, danske produktbeskrivelser for rom-produkter ved at syntetisere information fra butikernes egne beskrivelser.

## Forudsætninger

- Node.js 18+ (anbefales 20+)
- npm / yarn
- Supabase database med de rigtige kolonner
- Mistral API-nøgle

## Setup

### 1. Kør database-migration

Før første kørsel, skal du tilføje de nødvendige kolonner til `products`-tabellen:

```sql
-- Kør denne SQL i Supabase dashboard under SQL editor
alter table products add column if not exists description text;
alter table products add column if not exists description_source text;
alter table products add column if not exists description_generated text;
alter table products add column if not exists description_status text;

-- Valgfrit: Opret index for bedre performance
create index if not exists idx_products_description_status on products (description_status);
create index if not exists idx_products_description_null on products (description) where description is not null;
```

Migration-filen findes også her: `supabase/migrations/20261113_add_product_descriptions.sql`

### 2. Verificér databasen

Kør check-scriptet for at verificere at alt er sat op korrekt:

```bash
npm run check:db
```

Dette vil:
- Tjekke om `products`-tabellen har de nødvendige kolonner
- Tjekke om `product_retailer_links` har `description` og `product_url` kolonner
- Tælle hvor mange produkter der har kildeskrivelser
- Rapportere status

### 3. Installer afhængigheder

```bash
npm install
```

### 4. Konfigurer miljøvariabler

Miljøvariablerne læses fra `.env.local` i projekt-roden. Sørg for at:

- `NEXT_PUBLIC_SUPABASE_URL` - Din Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (til server-side skrivninger)
- `MISTRAL_API_KEY` - Din Mistral API-nøgle

## Kørsel

### Kør fuld pipeline

```bash
npm run generate:descriptions
```

### Kør kun for mislykkede/produkter uden beskrivelse (re-run)

```bash
npm run generate:descriptions:rerun
# eller
npm run generate:descriptions -- --rerun-failed
```

**Forskellen:**
- `npm run generate:descriptions` - Kører kun for produkter hvor `description IS NULL`
- `npm run generate:descriptions:rerun` - Kører for produkter hvor `description IS NULL` **ELLER** `description_status != 'PASS'`

Dette er nyttigt til at genbehandle produkter der tidligere mislykkedes (FAIL status) eller som ikke havde en genereret beskrivelse.

Dette script:
1. Indsamler alle produkter uden en genereret beskrivelse
2. For hver produkt, henter alle kildeskrivelser fra `product_retailer_links.description`
3. Genererer en neutral, dansk beskrivelse via Mistral API
4. Validerer beskrivelsen mod sikkerhedsregler
5. Promoverer godkendte beskrivelser til `products.description`
6. Generer en rapport med statistik og stikprøver

### Rapport

Efter kørsel genereres:
- `scripts/generation_report.txt` - Detaljeret rapport med alle resultater
- `scripts/description_generation.log` - Log-fil med kørselsdetaljer

## Pipeline-trin i detaljer

### Trin 1: Indsaml
- Henter alle produkter fra `products` hvor `description IS NULL`
- For hvert produkt, henter alle relaterede rækker fra `product_retailer_links`
- Filtrerer kildeskrivelser: fjerner duplicater, trimmer whitespace, droppper < 40 tegn
- Gemmer kilder med reference til URL for sporbarhed

### Trin 2: Generér
- Bruger Mistral API (`mistral-small-latest`)
- System-prompt: Se `scripts/description_prompt.md`
- User-prompt indeholder: Produktnavn, Brand, Volumen, ABV, og alle kildeskrivelser
- Temperatur: 0.3 (lav for mere konsistente resultater)
- Max tokens: 500

### Trin 3: Valider
Alle genererede tekster valideres mod disse regler:

| Regel | Beskrivelse | Fejlkode |
|-------|-------------|----------|
| Længde | 200-800 tegn | `LEN` |
| Dansk | Indeholder æ/ø/å ELLER ≥5 danske stopord | `LANG` |
| Kopi | Ingen 6-grams-sekvens delt med kilder | `COPY` |
| Faktuel | Alle tal kan spores til kilder eller produktdata | `FACT` |
| Forbudt | Ingen butiksnavne, priser, markedsføring | `BAN` |

### Trin 4: LLM-review (valgfrit)
- Beskrivelser med `FACT`-fejl sendes til ekstra validering
- Bruger en striks faktatjekker-prompt
- Returnerer JSON med `ok: true/false` og `violations`

### Trin 5: Promover
- `PASS` → `products.description` udfyldes, `description_source = 'generated'`
- `FAIL`/`LLM_REVIEW false` → Gemmes i `description_generated` med status, **promoveres ikke**

### Trin 6: Rapport
Udskriver:
- Antal PASS/FAIL pr. fejlkode
- Liste af FAIL-produkter (id + navn)
- 20 tilfældige PASS-tekster som stikprøve

## Fejlkoder

| Kode | Beskrivelse | Handling |
|------|-------------|----------|
| `LEN` | Forkert længde (200-800 tegn) | FAIL |
| `LANG` | Ikke dansk | FAIL |
| `COPY` | Kopieret fra kilde (6-grams) | FAIL |
| `FACT` | Tal uden grundlag | LLM_REVIEW |
| `BAN` | Forbudt term fundet | FAIL |
| `GEN_ERROR` | Generering mislykkedes | FAIL |

## Rate Limiting

- Max 4 parallelle Mistral API-kald
- Exponential backoff ved 429 (rate limit)
- Op til 3 retries pr. request
- 1 sekunds pause mellem batches

## Data flow

```
product_retailer_links.description (kildeskrivelser)
                          ↓
           [Dedup, filter < 40 chars]
                          ↓
            Generer via Mistral API
                          ↓
              Valider (regler)
                          ↓
           PASS → products.description
           FAIL → products.description_generated (audit)
```

## Månedlig opdatering

For at køre scriptet månedligt kun for nye produkter:

Scriptet kører automatisk kun for produkter med `description IS NULL`, så du kan simpelthen køre:

```bash
npm run generate:descriptions
```

Hver gang. Det vil kun behandle produkter der endnu ikke har en genereret beskrivelse.

## Transparens

Beskrivelser markeret med `description_source='generated'` kan senere vise en note i UI'en:

```
Beskrivelse genereret ud fra butikkers produktinformation
```

## Sikkerhed

- Ingen manuel godkendelse nødvendig for de fleste tilfælde
- Alle afvisninger logges og kan revideres
- Stikprøver af godkendte tekster udskrives til manuel kontrol
- Alle data gemmes med sporbarhed (kilder, timestamps, status)

## Fejlfinding

### "Missing Supabase configuration"
Sørg for at `.env.local` findes i projekt-roden med de korrekte variabler.

### "Missing Mistral API key"
Tjek at `MISTRAL_API_KEY` er sat i `.env.local`.

### "Products table is missing required columns"
Kør migrationen som beskrevet ovenfor.

### Rate limiting / 429 errors
Scriptet håndterer dette automatisk med exponential backoff. Hvis det fortsætter, vent et stykke tid før genstart.

### Mistral API errors
Tjek at din API-nøgle er gyldig og har kredit.

## Filer

- `generate_descriptions_from_links.ts` - Hovedscriptet
- `description_prompt.md` - System-prompt til AI
- `check_database.ts` - Database-verificering
- `README.md` - Denne fil
- `generation_report.txt` - Output rapport (genereres ved kørsel)
- `description_generation.log` - Log-fil (genereres ved kørsel)

## Teknisk

- Bruger `product_retailer_links.description` som kilder (i stedet for staging-tabeller)
- Understøtter automatisk deduplikering af identiske kilder
- Validering er rule-baseret for hurtig feedback
- LLM-review kun for usikre tilfælde (FACT errors)
- Ingen eksterne afhængigheder udover Supabase og Mistral API
