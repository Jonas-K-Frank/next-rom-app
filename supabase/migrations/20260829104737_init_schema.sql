-- Initial schema for rum-prissammenligning.
-- retailers -> products -> product_retailer_links -> prices (append-only history)

create table if not exists retailers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  base_url text not null,
  logo_url text,
  created_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text,
  volume_ml integer,
  abv numeric(4, 1),
  category text,
  created_at timestamptz not null default now()
);

-- Kobler et produkt til én forhandlers side for det (fx samme rom hos to
-- forhandlere = to rækker her, begge peger på samme product_id).
create table if not exists product_retailer_links (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  retailer_id uuid not null references retailers (id) on delete cascade,
  product_url text not null,
  external_id text,
  created_at timestamptz not null default now(),
  unique (product_id, retailer_id)
);

-- Append-only prishistorik: hver scraping indsætter en ny række i stedet for
-- at opdatere en eksisterende, så vi kan tegne priskurver over tid.
create table if not exists prices (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references product_retailer_links (id) on delete cascade,
  price numeric(10, 2) not null,
  in_stock boolean not null default true,
  scraped_at timestamptz not null default now()
);

create index if not exists idx_product_retailer_links_product_id
  on product_retailer_links (product_id);
create index if not exists idx_product_retailer_links_retailer_id
  on product_retailer_links (retailer_id);

-- Understøtter "seneste pris pr. link" og "prishistorik for et link" opslag.
create index if not exists idx_prices_link_id_scraped_at
  on prices (link_id, scraped_at desc);

-- Håndhæver append-only: ingen kan opdatere eller slette pris-historik.
revoke update, delete on prices from anon, authenticated;

alter table retailers enable row level security;
alter table products enable row level security;
alter table product_retailer_links enable row level security;
alter table prices enable row level security;

-- v1 har ingen brugerkonti, så alt er offentligt læsbart. Skrivning sker kun
-- server-side via service role key (Apify-webhook), som omgår RLS.
create policy "Public read access" on retailers for select using (true);
create policy "Public read access" on products for select using (true);
create policy "Public read access" on product_retailer_links for select using (true);
create policy "Public read access" on prices for select using (true);
