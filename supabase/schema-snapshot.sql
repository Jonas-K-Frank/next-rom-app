--
-- PostgreSQL database dump
--

\restrict wwO6NKhB33vr7d7zdDj7nzyfqzkmRH5KCWpjHsygwFkFscwX8FBNkCfMDO6vxCg

-- Dumped from database version 17.6
-- Dumped by pg_dump version 19.0

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: decode_entities(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.decode_entities(raw text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    code INT;
    res  TEXT := coalesce(raw, '');
BEGIN
    res := replace(res, '&amp;' , '&');
    res := replace(res, '&nbsp;', ' ');
    res := replace(res, '&quot;', '"');

    FOR code IN SELECT (regexp_matches(res, '&#([0-9]+);', 'g'))[1]::INT
    LOOP
        res := replace(res, '&#' || code || ';', chr(code));
    END LOOP;

    res := regexp_replace(res, '&#[0-9]+;', '', 'g');
    RETURN res;
END;
$$;


--
-- Name: extract_numbers(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.extract_numbers(raw text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
SELECT array_to_string(
    ARRAY (SELECT DISTINCT m[1]
           FROM regexp_matches(regexp_replace(raw, '[.,]', '', 'g'), '(\d+)', 'g') m
           ORDER BY m[1]),
    '-')
$$;


--
-- Name: import_shop(text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.import_shop(p_shop_name text, p_base_url text, p_staging text, p_category text DEFAULT 'Rom'::text) RETURNS TABLE(produkter bigint, links bigint, priser bigint)
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- 1) Butikken
    INSERT INTO retailers (id, name, base_url, created_at)
    VALUES (gen_random_uuid(), p_shop_name, p_base_url, now())
    ON CONFLICT (base_url) DO UPDATE SET name = EXCLUDED.name;

    -- 2) Produkterne (dedup + dekodning, som whisky.dk-versionen)
    EXECUTE format('
        WITH dedup AS (
            SELECT DISTINCT ON (normalize_name(s.name), COALESCE(s.volume_cl * 10, 0)) s.*
            FROM %I s
            WHERE s.name IS NOT NULL
            ORDER BY normalize_name(s.name), COALESCE(s.volume_cl * 10, 0), s.url
        )
        INSERT INTO products (id, name, volume_ml, abv, category, created_at, image_url, normalized_name)
        SELECT gen_random_uuid(), decode_entities(d.name), COALESCE(d.volume_cl * 10, 0),
               d.abv, %L, now(), d.image_url, normalize_name(d.name)
        FROM dedup d
        ON CONFLICT (normalized_name, volume_ml) DO UPDATE
            SET name      = decode_entities(EXCLUDED.name),
                abv       = COALESCE(EXCLUDED.abv, products.abv),
                image_url = COALESCE(EXCLUDED.image_url, products.image_url)
    ', p_staging, p_category);

    -- 3) Linkene
    EXECUTE format('
        WITH dedup AS (
            SELECT DISTINCT ON (normalize_name(s.name), COALESCE(s.volume_cl * 10, 0)) s.*
            FROM %I s
            WHERE s.name IS NOT NULL
            ORDER BY normalize_name(s.name), COALESCE(s.volume_cl * 10, 0), s.url
        )
        INSERT INTO product_retailer_links (id, product_id, retailer_id, product_url, external_id, description, created_at)
        SELECT gen_random_uuid(), p.id, r.id, d.url,
               substring(d.url from ''(\d+)''),
               decode_entities(d.description), now()
        FROM dedup d
        JOIN products p
             ON p.normalized_name = normalize_name(d.name)
            AND p.volume_ml = COALESCE(d.volume_cl * 10, 0)
        JOIN retailers r ON r.base_url = %L
        ON CONFLICT (product_url) DO UPDATE
            SET description = decode_entities(EXCLUDED.description)
    ', p_staging, p_base_url);

    -- 4) Priserne
    EXECUTE format('
        WITH dedup AS (
            SELECT DISTINCT ON (normalize_name(s.name), COALESCE(s.volume_cl * 10, 0)) s.*
            FROM %I s
            WHERE s.name IS NOT NULL
            ORDER BY normalize_name(s.name), COALESCE(s.volume_cl * 10, 0), s.url
        )
        INSERT INTO prices (id, link_id, price, in_stock, scraped_at)
        SELECT gen_random_uuid(), l.id, d.price_dkk, d.in_stock, d.scraped_at
        FROM dedup d
        JOIN product_retailer_links l ON l.product_url = d.url
        WHERE d.price_dkk IS NOT NULL
          AND NOT EXISTS (
              SELECT 1 FROM prices pr
              WHERE pr.link_id = l.id
                AND pr.scraped_at = d.scraped_at
          )
    ', p_staging);

    RETURN QUERY SELECT
        (SELECT count(*) FROM products),
        (SELECT count(*) FROM product_retailer_links),
        (SELECT count(*) FROM prices);
END;
$$;


--
-- Name: normalize_name(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.normalize_name(raw text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
    SELECT trim(both ' ' FROM regexp_replace(regexp_replace(regexp_replace(
        regexp_replace(regexp_replace(regexp_replace(
            lower(
                replace(replace(replace(replace(replace(
                    coalesce(raw, ''),
                    U&'\00A0', ' '),
                    '&#229;', 'å'), '&#248;', 'ø'), '&#230;', 'æ'), '&amp;', '&')),
            '\d+([.,][0-9]+)?[[:space:]]*(cl|ml|liter|l)\y', '', 'g'),
            '\d+([.,][0-9]+)?[[:space:]]*%', '', 'g'),
            '\(.*?\)', '', 'g'),
            '&#[0-9]+;', ' ', 'g'),
            '[^a-z0-9åøæ[:space:]]', '', 'g'),
            '[[:space:]]+', ' ', 'g'))
$$;


--
-- Name: normalize_name_v2(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.normalize_name_v2(raw text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
SELECT btrim(regexp_replace(
         regexp_replace(
         regexp_replace(
         regexp_replace(
         regexp_replace(
         regexp_replace(
           lower(coalesce(decode_entities(raw), '')),
           '''', '', 'g'),                                     -- apostroffer
           '[0-9]+([.,][0-9]+)?\s*%\s*(vol)?', '', 'g'),       -- "40%", "41,2% vol"
           '\y\d+([.,][0-9]+)?\s*(cl|ml|l|liter)\y', '', 'g'),  -- "70 cl", "1 liter"
           '\y(rom|rum)\y', '', 'g'),                           -- rom/rum som selvstændige ord
           '[[:punct:]]', ' ', 'g'),
         '\s+', ' ', 'g'));
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: prices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    link_id uuid NOT NULL,
    price numeric(10,2) NOT NULL,
    in_stock boolean DEFAULT true NOT NULL,
    scraped_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: latest_prices; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.latest_prices WITH (security_invoker='true') AS
 SELECT DISTINCT ON (link_id) id,
    link_id,
    price,
    in_stock,
    scraped_at
   FROM public.prices
  ORDER BY link_id, scraped_at DESC;


--
-- Name: product_retailer_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_retailer_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    retailer_id uuid NOT NULL,
    product_url text NOT NULL,
    external_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    description text
);


--
-- Name: product_lowest_prices; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.product_lowest_prices WITH (security_invoker='true') AS
 SELECT prl.product_id,
    min(lp.price) AS lowest_price,
    count(DISTINCT prl.retailer_id) AS retailer_count,
    max(lp.price) AS highest_price
   FROM (public.product_retailer_links prl
     JOIN public.latest_prices lp ON ((lp.link_id = prl.id)))
  WHERE lp.in_stock
  GROUP BY prl.product_id;


--
-- Name: catalog_stats; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.catalog_stats WITH (security_invoker='true') AS
 SELECT ( SELECT count(*) AS count
           FROM public.product_lowest_prices) AS product_count,
    ( SELECT count(DISTINCT prl.retailer_id) AS count
           FROM (public.product_retailer_links prl
             JOIN public.latest_prices lp ON ((lp.link_id = prl.id)))
          WHERE lp.in_stock) AS retailer_count;


--
-- Name: product_price_drops; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.product_price_drops WITH (security_invoker='true') AS
 WITH ranked_prices AS (
         SELECT prices.link_id,
            prices.price,
            row_number() OVER (PARTITION BY prices.link_id ORDER BY prices.scraped_at DESC) AS rn
           FROM public.prices
        ), link_deltas AS (
         SELECT curr.link_id,
            curr.price AS latest_price,
            prev.price AS previous_price
           FROM (ranked_prices curr
             JOIN ranked_prices prev ON (((prev.link_id = curr.link_id) AND (prev.rn = (curr.rn + 1)))))
          WHERE (curr.rn = 1)
        )
 SELECT prl.product_id,
    max((((d.previous_price - d.latest_price) / d.previous_price) * (100)::numeric)) AS best_price_drop_pct
   FROM (link_deltas d
     JOIN public.product_retailer_links prl ON ((prl.id = d.link_id)))
  WHERE (d.previous_price > (0)::numeric)
  GROUP BY prl.product_id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    brand text,
    volume_ml integer,
    abv numeric(4,1),
    category text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    image_url text,
    normalized_name text,
    description text,
    description_source text,
    description_generated text,
    description_status text,
    country text
);


--
-- Name: retailers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.retailers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    base_url text NOT NULL,
    logo_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: stg_foetex_dk; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stg_foetex_dk (
    name text,
    url text,
    price_dkk numeric,
    in_stock boolean,
    volume_cl numeric,
    abv numeric,
    image_url text,
    description text,
    scraped_at timestamp with time zone
);


--
-- Name: stg_hjhansen_vin_dk; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stg_hjhansen_vin_dk (
    name text,
    url text,
    price_dkk numeric,
    in_stock boolean,
    volume_cl numeric,
    abv numeric,
    image_url text,
    description text,
    scraped_at timestamp with time zone
);


--
-- Name: stg_juuls_dk; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stg_juuls_dk (
    name text,
    url text,
    price_dkk numeric,
    in_stock boolean,
    volume_cl numeric,
    abv numeric,
    image_url text,
    description text,
    scraped_at timestamp with time zone
);


--
-- Name: stg_kokkensvinhus_dk; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stg_kokkensvinhus_dk (
    name text,
    url text,
    price_dkk numeric,
    in_stock boolean,
    volume_cl numeric,
    abv numeric,
    image_url text,
    description text,
    scraped_at timestamp with time zone
);


--
-- Name: stg_rombo_dk; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stg_rombo_dk (
    name text,
    url text,
    price_dkk numeric,
    in_stock boolean,
    volume_cl numeric,
    abv numeric,
    image_url text,
    description text,
    scraped_at timestamp with time zone DEFAULT '2026-11-07 16:00:00+00'::timestamp with time zone
);


--
-- Name: stg_spitus_dk; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stg_spitus_dk (
    name text,
    url text,
    price_dkk numeric,
    in_stock boolean,
    volume_cl numeric,
    abv numeric,
    image_url text,
    description text,
    scraped_at timestamp with time zone DEFAULT '2026-11-08 08:30:00+00'::timestamp with time zone
);


--
-- Name: stg_uhrskov_dk; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stg_uhrskov_dk (
    name text,
    url text,
    price_dkk numeric,
    in_stock boolean,
    volume_cl numeric,
    abv numeric,
    image_url text,
    description text,
    scraped_at timestamp with time zone
);


--
-- Name: stg_vinmedmere_dk; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stg_vinmedmere_dk (
    name text,
    url text,
    price_dkk numeric,
    in_stock boolean,
    volume_cl numeric,
    abv numeric,
    image_url text,
    description text,
    scraped_at timestamp with time zone
);


--
-- Name: stg_whisky_dk; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stg_whisky_dk (
    url text,
    shop text,
    name text,
    price_dkk double precision,
    price_dkk_formatted text,
    abv double precision,
    volume_cl bigint,
    description text,
    image_url text,
    in_stock boolean,
    scraped_at timestamp with time zone,
    error boolean,
    debug_request_id text,
    debug_url text,
    debug_loaded_url text,
    debug_method text,
    debug_retry_count bigint,
    debug_error_messages jsonb,
    debug_status_code bigint
);


--
-- Name: stg_whiskyeksperten_dk; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stg_whiskyeksperten_dk (
    name text,
    url text,
    price_dkk numeric,
    in_stock boolean,
    volume_cl numeric,
    abv numeric,
    image_url text,
    description text,
    scraped_at timestamp with time zone
);


--
-- Name: prices prices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prices
    ADD CONSTRAINT prices_pkey PRIMARY KEY (id);


--
-- Name: product_retailer_links product_retailer_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_retailer_links
    ADD CONSTRAINT product_retailer_links_pkey PRIMARY KEY (id);


--
-- Name: product_retailer_links product_retailer_links_product_id_retailer_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_retailer_links
    ADD CONSTRAINT product_retailer_links_product_id_retailer_id_key UNIQUE (product_id, retailer_id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: retailers retailers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.retailers
    ADD CONSTRAINT retailers_pkey PRIMARY KEY (id);


--
-- Name: stg_rombo_dk stg_rombo_dk_url_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_rombo_dk
    ADD CONSTRAINT stg_rombo_dk_url_key UNIQUE (url);


--
-- Name: stg_spitus_dk stg_spitus_dk_url_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_spitus_dk
    ADD CONSTRAINT stg_spitus_dk_url_key UNIQUE (url);


--
-- Name: stg_whisky_dk stg_whisky_dk_url_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stg_whisky_dk
    ADD CONSTRAINT stg_whisky_dk_url_key UNIQUE (url);


--
-- Name: idx_prices_link_id_scraped_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prices_link_id_scraped_at ON public.prices USING btree (link_id, scraped_at DESC);


--
-- Name: idx_product_retailer_links_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_retailer_links_product_id ON public.product_retailer_links USING btree (product_id);


--
-- Name: idx_product_retailer_links_retailer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_retailer_links_retailer_id ON public.product_retailer_links USING btree (retailer_id);


--
-- Name: links_product_url_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX links_product_url_key ON public.product_retailer_links USING btree (product_url);


--
-- Name: products_name_volume_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX products_name_volume_key ON public.products USING btree (normalized_name, volume_ml);


--
-- Name: retailers_base_url_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX retailers_base_url_key ON public.retailers USING btree (base_url);


--
-- Name: prices prices_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prices
    ADD CONSTRAINT prices_link_id_fkey FOREIGN KEY (link_id) REFERENCES public.product_retailer_links(id) ON DELETE CASCADE;


--
-- Name: product_retailer_links product_retailer_links_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_retailer_links
    ADD CONSTRAINT product_retailer_links_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_retailer_links product_retailer_links_retailer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_retailer_links
    ADD CONSTRAINT product_retailer_links_retailer_id_fkey FOREIGN KEY (retailer_id) REFERENCES public.retailers(id) ON DELETE CASCADE;


--
-- Name: prices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prices ENABLE ROW LEVEL SECURITY;

--
-- Name: product_retailer_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_retailer_links ENABLE ROW LEVEL SECURITY;

--
-- Name: products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

--
-- Name: product_retailer_links public read links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public read links" ON public.product_retailer_links FOR SELECT TO authenticated, anon USING (true);


--
-- Name: prices public read prices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public read prices" ON public.prices FOR SELECT TO authenticated, anon USING (true);


--
-- Name: products public read products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public read products" ON public.products FOR SELECT TO authenticated, anon USING (true);


--
-- Name: retailers public read retailers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public read retailers" ON public.retailers FOR SELECT TO authenticated, anon USING (true);


--
-- Name: retailers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.retailers ENABLE ROW LEVEL SECURITY;

--
-- Name: stg_foetex_dk; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stg_foetex_dk ENABLE ROW LEVEL SECURITY;

--
-- Name: stg_hjhansen_vin_dk; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stg_hjhansen_vin_dk ENABLE ROW LEVEL SECURITY;

--
-- Name: stg_juuls_dk; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stg_juuls_dk ENABLE ROW LEVEL SECURITY;

--
-- Name: stg_kokkensvinhus_dk; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stg_kokkensvinhus_dk ENABLE ROW LEVEL SECURITY;

--
-- Name: stg_rombo_dk; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stg_rombo_dk ENABLE ROW LEVEL SECURITY;

--
-- Name: stg_spitus_dk; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stg_spitus_dk ENABLE ROW LEVEL SECURITY;

--
-- Name: stg_uhrskov_dk; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stg_uhrskov_dk ENABLE ROW LEVEL SECURITY;

--
-- Name: stg_vinmedmere_dk; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stg_vinmedmere_dk ENABLE ROW LEVEL SECURITY;

--
-- Name: stg_whiskyeksperten_dk; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stg_whiskyeksperten_dk ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: TABLE prices; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.prices TO anon;
GRANT ALL ON TABLE public.prices TO authenticated;
GRANT ALL ON TABLE public.prices TO service_role;


--
-- Name: TABLE latest_prices; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.latest_prices TO anon;
GRANT ALL ON TABLE public.latest_prices TO authenticated;
GRANT ALL ON TABLE public.latest_prices TO service_role;


--
-- Name: TABLE product_retailer_links; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.product_retailer_links TO anon;
GRANT ALL ON TABLE public.product_retailer_links TO authenticated;
GRANT ALL ON TABLE public.product_retailer_links TO service_role;


--
-- Name: TABLE product_lowest_prices; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.product_lowest_prices TO anon;
GRANT ALL ON TABLE public.product_lowest_prices TO authenticated;
GRANT ALL ON TABLE public.product_lowest_prices TO service_role;


--
-- Name: TABLE catalog_stats; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.catalog_stats TO anon;
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.catalog_stats TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.catalog_stats TO service_role;


--
-- Name: TABLE product_price_drops; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.product_price_drops TO anon;
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.product_price_drops TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.product_price_drops TO service_role;


--
-- Name: TABLE products; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.products TO anon;
GRANT ALL ON TABLE public.products TO authenticated;
GRANT ALL ON TABLE public.products TO service_role;


--
-- Name: TABLE retailers; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.retailers TO anon;
GRANT ALL ON TABLE public.retailers TO authenticated;
GRANT ALL ON TABLE public.retailers TO service_role;


--
-- Name: TABLE stg_foetex_dk; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.stg_foetex_dk TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.stg_foetex_dk TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.stg_foetex_dk TO service_role;


--
-- Name: TABLE stg_hjhansen_vin_dk; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.stg_hjhansen_vin_dk TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.stg_hjhansen_vin_dk TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.stg_hjhansen_vin_dk TO service_role;


--
-- Name: TABLE stg_juuls_dk; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.stg_juuls_dk TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.stg_juuls_dk TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.stg_juuls_dk TO service_role;


--
-- Name: TABLE stg_kokkensvinhus_dk; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.stg_kokkensvinhus_dk TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.stg_kokkensvinhus_dk TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.stg_kokkensvinhus_dk TO service_role;


--
-- Name: TABLE stg_rombo_dk; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.stg_rombo_dk TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.stg_rombo_dk TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.stg_rombo_dk TO service_role;


--
-- Name: TABLE stg_spitus_dk; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.stg_spitus_dk TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.stg_spitus_dk TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.stg_spitus_dk TO service_role;


--
-- Name: TABLE stg_uhrskov_dk; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.stg_uhrskov_dk TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.stg_uhrskov_dk TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.stg_uhrskov_dk TO service_role;


--
-- Name: TABLE stg_vinmedmere_dk; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.stg_vinmedmere_dk TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.stg_vinmedmere_dk TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.stg_vinmedmere_dk TO service_role;


--
-- Name: TABLE stg_whisky_dk; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.stg_whisky_dk TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.stg_whisky_dk TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.stg_whisky_dk TO service_role;


--
-- Name: TABLE stg_whiskyeksperten_dk; Type: ACL; Schema: public; Owner: -
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.stg_whiskyeksperten_dk TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.stg_whiskyeksperten_dk TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.stg_whiskyeksperten_dk TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT UPDATE ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT UPDATE ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT UPDATE ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--

\unrestrict wwO6NKhB33vr7d7zdDj7nzyfqzkmRH5KCWpjHsygwFkFscwX8FBNkCfMDO6vxCg

