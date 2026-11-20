-- Tilføj land-kolonne til produkter (til PDP-stempel og fremtidig filtrering)
alter table if exists products
add column if not exists country text;
