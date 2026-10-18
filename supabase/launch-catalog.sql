-- =============================================================================
-- The Atelier by SK — Launch Catalog Migration
-- DO NOT RUN AUTOMATICALLY — Awaiting client confirmation of catalog details.
-- =============================================================================

begin;

-- 1. Clean up seed placeholder paintings (only if no existing order_items reference them)
delete from public.paintings
where slug like 'placeholder-%'
  and not exists (
    select 1 from public.order_items oi where oi.painting_id = public.paintings.id
  );

-- 2. Insert real authentic paintings from paintings.js
-- Idempotent: on conflict (slug) do update.
-- Uncertain values marked with -- CONFIRM WITH CLIENT

insert into public.paintings (
  id,
  slug,          -- CONFIRM WITH CLIENT
  title,         -- CONFIRM WITH CLIENT
  description,
  price_pkr,     -- CONFIRM WITH CLIENT
  width_cm,      -- CONFIRM WITH CLIENT
  height_cm,     -- CONFIRM WITH CLIENT
  medium,
  year,
  status,
  featured
)
values
  (
    '226ae6d8-71d6-42a7-a477-d85bf081c12c',
    'al-asr',         -- CONFIRM WITH CLIENT
    'Al-Asr',         -- CONFIRM WITH CLIENT
    'Calligraphy combining painted and textured techniques on canvas.',
    285000,           -- CONFIRM WITH CLIENT
    90,               -- CONFIRM WITH CLIENT
    120,              -- CONFIRM WITH CLIENT
    'Textured calligraphy on canvas',
    2025,
    'available',
    true
  ),
  (
    'f60d727c-6dfa-433e-af23-feb4b6f37b21',
    'mountain-ridge', -- CONFIRM WITH CLIENT
    'Mountain Ridge', -- CONFIRM WITH CLIENT
    'Mountain landscape painted with brushes and palette knives on canvas with textured details.',
    195000,           -- CONFIRM WITH CLIENT
    80,               -- CONFIRM WITH CLIENT
    120,              -- CONFIRM WITH CLIENT
    'Mixed media on canvas',
    2025,
    'available',
    true
  )
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  price_pkr = excluded.price_pkr,
  width_cm = excluded.width_cm,
  height_cm = excluded.height_cm,
  medium = excluded.medium,
  year = excluded.year,
  status = excluded.status,
  featured = excluded.featured,
  updated_at = now();

-- 3. Insert real primary images (sort_order 0)
insert into public.painting_images (painting_id, url, storage_path, sort_order, alt)
select p.id, v.url, null, v.sort_order, v.alt
from (values
  ('al-asr',         '/artworks/al-asr-primary.jpg',       0, 'Al-Asr · Textured calligraphy on canvas'),
  ('mountain-ridge', '/artworks/gilded-ridge-primary.jpg', 0, 'Mountain Ridge · Mixed media on canvas')
) as v(slug, url, sort_order, alt)
join public.paintings p on p.slug = v.slug
where not exists (
  select 1 from public.painting_images i
  where i.painting_id = p.id and i.url = v.url
);

commit;
