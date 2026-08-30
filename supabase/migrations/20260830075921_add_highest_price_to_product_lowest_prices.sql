-- Tilføjer højeste aktuelle pris pr. produkt, så forsiden kan tegne
-- prisposition-baren (laveste pris relativt til det fulde prisinterval)
-- uden en ekstra query. Kolonnen tilføjes til sidst, så eksisterende
-- konsumenter af product_id/lowest_price/retailer_count ikke påvirkes.
create or replace view product_lowest_prices
with (security_invoker = true) as
select
  prl.product_id,
  min(lp.price) as lowest_price,
  count(distinct prl.retailer_id) as retailer_count,
  max(lp.price) as highest_price
from product_retailer_links prl
join latest_prices lp on lp.link_id = prl.id
where lp.in_stock
group by prl.product_id;
