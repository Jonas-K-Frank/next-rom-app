-- Views der gør det billigt at hente "prisen lige nu" uden at scanne hele
-- prishistorikken for hvert opslag. security_invoker sikrer at views kører
-- med den kaldende rolles rettigheder, så RLS-policies på de underliggende
-- tabeller stadig håndhæves (i stedet for view-ejerens rettigheder).

-- Seneste pris pr. forhandler-link.
create view latest_prices
with (security_invoker = true) as
select distinct on (link_id)
  id,
  link_id,
  price,
  in_stock,
  scraped_at
from prices
order by link_id, scraped_at desc;

-- Laveste aktuelle pris pr. produkt på tværs af forhandlere (kun links der
-- er på lager), brugt på forsiden.
create view product_lowest_prices
with (security_invoker = true) as
select
  prl.product_id,
  min(lp.price) as lowest_price,
  count(distinct prl.retailer_id) as retailer_count
from product_retailer_links prl
join latest_prices lp on lp.link_id = prl.id
where lp.in_stock
group by prl.product_id;
