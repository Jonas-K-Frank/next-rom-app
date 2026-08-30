-- Billede af flasken. Ligger på products (ikke product_retailer_links), da
-- det er samme flaske uanset hvilken forhandler den sælges hos.
alter table products add column if not exists image_url text;
