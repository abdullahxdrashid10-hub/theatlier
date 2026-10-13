-- =============================================================================
-- The Atelier by SK — seed data (M2.1)
-- =============================================================================
-- 12 PLACEHOLDER paintings copied from src/data/paintings.js.
-- 9 available, 3 sold, 4 featured. No orders.
-- Idempotent: re-running does not duplicate rows (paintings keyed by slug;
-- images are inserted only when that painting/url pair is missing).
-- Run AFTER schema.sql. Runs as the SQL Editor role, which bypasses RLS.
-- =============================================================================

insert into public.paintings
  (slug, title, description, price_pkr, width_cm, height_cm, medium, year, status, featured)
values
  ('placeholder-ember-field',     'Placeholder 01 · Ember Field',     'PLACEHOLDER — sample description for a one-of-one original. Replace with the real story of this work once the client supplies it.', 185000,  90, 120, 'Oil on canvas',          2025, 'available', true),
  ('placeholder-slow-gold',       'Placeholder 02 · Slow Gold',       'PLACEHOLDER — sample description for a one-of-one original. Replace with the real story of this work once the client supplies it.',  95000,  60,  80, 'Acrylic on canvas',      2025, 'available', false),
  ('placeholder-bronze-hour',     'Placeholder 03 · Bronze Hour',     'PLACEHOLDER — sample description for a one-of-one original. Replace with the real story of this work once the client supplies it.', 240000, 120,  90, 'Oil on canvas',          2024, 'available', true),
  ('placeholder-night-ledger',    'Placeholder 04 · Night Ledger',    'PLACEHOLDER — sample description for a one-of-one original. Replace with the real story of this work once the client supplies it.', 130000,  70, 100, 'Mixed media on canvas', 2024, 'sold',      false),
  ('placeholder-quiet-ridge',     'Placeholder 05 · Quiet Ridge',     'PLACEHOLDER — sample description for a one-of-one original. Replace with the real story of this work once the client supplies it.',  75000,  50,  50, 'Acrylic on canvas',      2025, 'available', false),
  ('placeholder-champagne-drift', 'Placeholder 06 · Champagne Drift', 'PLACEHOLDER — sample description for a one-of-one original. Replace with the real story of this work once the client supplies it.', 210000, 100, 100, 'Oil on canvas',          2025, 'available', true),
  ('placeholder-low-light',       'Placeholder 07 · Low Light',       'PLACEHOLDER — sample description for a one-of-one original. Replace with the real story of this work once the client supplies it.', 110000,  80,  60, 'Oil on board',           2023, 'sold',      false),
  ('placeholder-umber-study',     'Placeholder 08 · Umber Study',     'PLACEHOLDER — sample description for a one-of-one original. Replace with the real story of this work once the client supplies it.',  65000,  40,  60, 'Acrylic on paper',       2024, 'available', false),
  ('placeholder-gilded-wake',     'Placeholder 09 · Gilded Wake',     'PLACEHOLDER — sample description for a one-of-one original. Replace with the real story of this work once the client supplies it.', 320000, 150, 100, 'Oil on canvas',          2025, 'available', true),
  ('placeholder-soft-iron',       'Placeholder 10 · Soft Iron',       'PLACEHOLDER — sample description for a one-of-one original. Replace with the real story of this work once the client supplies it.',  88000,  60,  90, 'Mixed media on canvas', 2024, 'available', false),
  ('placeholder-last-embers',     'Placeholder 11 · Last Embers',     'PLACEHOLDER — sample description for a one-of-one original. Replace with the real story of this work once the client supplies it.', 155000,  90,  90, 'Oil on canvas',          2023, 'sold',      false),
  ('placeholder-copper-tide',     'Placeholder 12 · Copper Tide',     'PLACEHOLDER — sample description for a one-of-one original. Replace with the real story of this work once the client supplies it.', 142000, 110,  80, 'Acrylic on canvas',      2025, 'available', false)
on conflict (slug) do nothing;

-- Two images per painting: main (sort_order 0) and detail (sort_order 1).
insert into public.painting_images (painting_id, url, storage_path, sort_order, alt)
select p.id, v.url, null, v.sort_order, v.alt
from (values
  ('placeholder-ember-field',     '/placeholders/placeholder-01.svg',        0, 'Placeholder 01 · Ember Field'),
  ('placeholder-ember-field',     '/placeholders/placeholder-01-detail.svg', 1, 'Placeholder 01 · Ember Field, detail'),
  ('placeholder-slow-gold',       '/placeholders/placeholder-02.svg',        0, 'Placeholder 02 · Slow Gold'),
  ('placeholder-slow-gold',       '/placeholders/placeholder-02-detail.svg', 1, 'Placeholder 02 · Slow Gold, detail'),
  ('placeholder-bronze-hour',     '/placeholders/placeholder-03.svg',        0, 'Placeholder 03 · Bronze Hour'),
  ('placeholder-bronze-hour',     '/placeholders/placeholder-03-detail.svg', 1, 'Placeholder 03 · Bronze Hour, detail'),
  ('placeholder-night-ledger',    '/placeholders/placeholder-04.svg',        0, 'Placeholder 04 · Night Ledger'),
  ('placeholder-night-ledger',    '/placeholders/placeholder-04-detail.svg', 1, 'Placeholder 04 · Night Ledger, detail'),
  ('placeholder-quiet-ridge',     '/placeholders/placeholder-05.svg',        0, 'Placeholder 05 · Quiet Ridge'),
  ('placeholder-quiet-ridge',     '/placeholders/placeholder-05-detail.svg', 1, 'Placeholder 05 · Quiet Ridge, detail'),
  ('placeholder-champagne-drift', '/placeholders/placeholder-06.svg',        0, 'Placeholder 06 · Champagne Drift'),
  ('placeholder-champagne-drift', '/placeholders/placeholder-06-detail.svg', 1, 'Placeholder 06 · Champagne Drift, detail'),
  ('placeholder-low-light',       '/placeholders/placeholder-07.svg',        0, 'Placeholder 07 · Low Light'),
  ('placeholder-low-light',       '/placeholders/placeholder-07-detail.svg', 1, 'Placeholder 07 · Low Light, detail'),
  ('placeholder-umber-study',     '/placeholders/placeholder-08.svg',        0, 'Placeholder 08 · Umber Study'),
  ('placeholder-umber-study',     '/placeholders/placeholder-08-detail.svg', 1, 'Placeholder 08 · Umber Study, detail'),
  ('placeholder-gilded-wake',     '/placeholders/placeholder-09.svg',        0, 'Placeholder 09 · Gilded Wake'),
  ('placeholder-gilded-wake',     '/placeholders/placeholder-09-detail.svg', 1, 'Placeholder 09 · Gilded Wake, detail'),
  ('placeholder-soft-iron',       '/placeholders/placeholder-10.svg',        0, 'Placeholder 10 · Soft Iron'),
  ('placeholder-soft-iron',       '/placeholders/placeholder-10-detail.svg', 1, 'Placeholder 10 · Soft Iron, detail'),
  ('placeholder-last-embers',     '/placeholders/placeholder-11.svg',        0, 'Placeholder 11 · Last Embers'),
  ('placeholder-last-embers',     '/placeholders/placeholder-11-detail.svg', 1, 'Placeholder 11 · Last Embers, detail'),
  ('placeholder-copper-tide',     '/placeholders/placeholder-12.svg',        0, 'Placeholder 12 · Copper Tide'),
  ('placeholder-copper-tide',     '/placeholders/placeholder-12-detail.svg', 1, 'Placeholder 12 · Copper Tide, detail')
) as v(slug, url, sort_order, alt)
join public.paintings p on p.slug = v.slug
where not exists (
  select 1 from public.painting_images i
  where i.painting_id = p.id and i.url = v.url
);
