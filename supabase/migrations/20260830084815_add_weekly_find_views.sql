-- Understøtter "Ugens fund"-modulet på forsiden:
--   product_price_drops: største procentvise prisfald pr. produkt siden
--     forrige scrape (kun links med mindst to prisobservationer bidrager).
--   catalog_stats: samlet antal produkter med en pris og antal forhandlere
--     der reelt bidrager med en pris lige nu, til infolinjen under modulet.

create view product_price_drops
with (security_invoker = true) as
with ranked_prices as (
  select
    link_id,
    price,
    row_number() over (partition by link_id order by scraped_at desc) as rn
  from prices
),
link_deltas as (
  select
    curr.link_id,
    curr.price as latest_price,
    prev.price as previous_price
  from ranked_prices curr
  join ranked_prices prev
    on prev.link_id = curr.link_id and prev.rn = curr.rn + 1
  where curr.rn = 1
)
select
  prl.product_id,
  max((d.previous_price - d.latest_price) / d.previous_price * 100) as best_price_drop_pct
from link_deltas d
join product_retailer_links prl on prl.id = d.link_id
where d.previous_price > 0
group by prl.product_id;

create view catalog_stats
with (security_invoker = true) as
select
  (select count(*) from product_lowest_prices) as product_count,
  (select count(distinct prl.retailer_id)
     from product_retailer_links prl
     join latest_prices lp on lp.link_id = prl.id
     where lp.in_stock) as retailer_count;

grant select on product_price_drops to anon, authenticated;
grant select on catalog_stats to anon, authenticated;
