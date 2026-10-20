-- =============================================================================
-- The Atelier by SK — Launch Catalog Migration
-- 13 Authentic Original Artworks by SK with Verified Pricing & Dimensions
-- =============================================================================

begin;

-- 1. Clean up seed placeholder paintings (only if no existing order_items reference them)
delete from public.paintings
where slug like 'placeholder-%'
  and not exists (
    select 1 from public.order_items oi where oi.painting_id = public.paintings.id
  );

-- 2. Insert authentic client catalog paintings
-- Idempotent: on conflict (slug) do update.
insert into public.paintings (
  id,
  slug,
  title,
  description,
  price_pkr,
  width_cm,
  height_cm,
  medium,
  year,
  status,
  featured
)
values
  (
    '226ae6d8-71d6-42a7-a477-d85bf081c12c',
    'al-asr',
    'Al-Asr',
    'Textured gold leaf drip calligraphy on deep canvas, capturing the sacred passage and solemn weight of time.',
    60000,
    91,
    122,
    'Mixed media & textured calligraphy on canvas',
    2025,
    'available',
    true
  ),
  (
    'f60d727c-6dfa-433e-af23-feb4b6f37b21',
    'mountain-ridge',
    'Mountain Ridge',
    'Sculptural palette knife mountain peaks textured with gold ridges beneath a suspended golden moon.',
    30000,
    61,
    91,
    'Mixed media on canvas',
    2025,
    'available',
    true
  ),
  (
    '7c1001a1-945f-4a92-b412-055f29450f39',
    'tajalli',
    'Tajalli',
    'Circular gold calligraphy centered within an ethereal cosmic aura of sapphire, cream, and textured golden radiance.',
    60000,
    91,
    122,
    'Textured calligraphy & acrylic on canvas',
    2025,
    'available',
    true
  ),
  (
    '7c1002a2-834c-4e81-a953-761aec91efdc',
    'nafs-e-rehmat',
    'Nafs-e-Rehmat (Diptych)',
    'Two-panel diptych of "Wa ma arsalnaka illa rahmatan lil-''alameen" crowned with cascading gold drip impasto over a calm sage olive field.',
    40000,
    122,
    91,
    'Diptych on dual canvas, mixed media & gold relief',
    2025,
    'available',
    true
  ),
  (
    '7c1003a3-7d2e-48a5-b164-10c6bf929187',
    'tajdeed',
    'Tajdeed',
    'Dynamic chevron strokes in indigo, gold, and slate echoing gratitude and divine blessings in motion ("Fabiayyi ala-i rabbikuma").',
    35000,
    91,
    61,
    'Textured acrylic & calligraphy on canvas',
    2025,
    'available',
    false
  ),
  (
    '7c1004a4-659f-4b13-9c21-f2f0974c1774',
    'ufaq-e-sukoon',
    'Ufaq-e-Sukoon',
    'Atmospheric horizontal horizon featuring vertical sculptural impasto ridges glowing beneath ambient warmth.',
    35000,
    91,
    61,
    'Sculptural palette knife impasto on canvas',
    2025,
    'available',
    false
  ),
  (
    '7c1005a5-512b-4fa6-843e-7aac68f3fba6',
    'sukoon-e-khak',
    'Sukoon-e-Khak',
    'Modernist balance of raw earthy pigments, burnt sienna, warm terracotta, and structured linear geometry.',
    25000,
    91,
    61,
    'Acrylic & textured plaster on canvas',
    2025,
    'available',
    false
  ),
  (
    '7c1006a6-407d-419b-a329-df0303234675',
    'iltija',
    'Iltija',
    'Sacred contemplation of "Rabbi inni lima anzalta ilayya min khayrin faqeer", grounded by raised gold impasto and delicate thuluth script.',
    35000,
    61,
    91,
    'Textured mixed media & gold leaf on canvas',
    2025,
    'available',
    false
  ),
  (
    '7c1007a7-319a-4c48-812e-1a8bb2cb1faf',
    'uns',
    'Uns',
    'Intimate contemplation of morning warmth, textured impasto steam swirls rising from rich espresso over rustic timber.',
    30000,
    61,
    61,
    'Textured oil & acrylic on canvas',
    2025,
    'available',
    false
  ),
  (
    '7c1008a8-208e-49b7-954f-4e9a96e7376f',
    'kursi-e-jalal',
    'Kursi-e-Jalal',
    'The majestic sweep of Ayat al-Kursi enveloped in swirling planetary brushwork and sculpted relief.',
    50000,
    107,
    91,
    'Calligraphy & circular impasto on canvas',
    2025,
    'available',
    true
  ),
  (
    '7c1009a9-197b-4df2-841a-bf64c37b8f17',
    'nuqoosh',
    'Nuqoosh',
    'A structured grid of sculptural impasto tablets in arctic white and glacial blue set against deep midnight navy.',
    35000,
    91,
    61,
    'Sculptural impasto relief on canvas',
    2025,
    'available',
    false
  ),
  (
    '7c1010aa-086c-48e3-930b-1a75497b4607',
    'yusra',
    'Yusra',
    'Sculpted seafoam waves crashing onto sunlit gold sand, bearing the promise "Indeed, with hardship comes ease".',
    35000,
    61,
    91,
    'Resin, textured impasto & calligraphy on canvas',
    2025,
    'available',
    false
  ),
  (
    '7c1011bb-f75d-47d4-82fa-1def60b3853e',
    'madar',
    'Madar',
    'Modernist harmony anchored by a tactile gold spiral sun, plaster quadrant, and organic minimalist silhouettes.',
    25000,
    91,
    61,
    'Mixed media, textured plaster & gold leaf on canvas',
    2025,
    'available',
    false
  )
on conflict (id) do update set
  slug = excluded.slug,
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

-- 3. Clean up and insert real images
delete from public.painting_images
where painting_id in (
  select id from public.paintings
);

insert into public.painting_images (painting_id, url, storage_path, sort_order, alt)
select p.id, v.url, null, v.sort_order, v.alt
from (values
  ('al-asr',         '/artworks/al-asr-room-new.jpg',       0, 'Al-Asr · Architectural in-situ view'),
  ('al-asr',         '/artworks/al-asr-detail.jpg',         1, 'Al-Asr · Macro gold drip texture'),
  ('al-asr',         '/artworks/al-asr-angle.jpg',          2, 'Al-Asr · Raking perspective view'),
  ('al-asr',         '/artworks/al-asr-primary.jpg',        3, 'Al-Asr · Full canvas frontal'),

  ('mountain-ridge', '/artworks/gilded-ridge-primary.jpg',  0, 'Mountain Ridge · Sculptural canvas'),
  ('mountain-ridge', '/artworks/gilded-ridge-detail.jpg',   1, 'Mountain Ridge · Impasto knife detail'),
  ('mountain-ridge', '/artworks/gilded-ridge-angle.jpg',    2, 'Mountain Ridge · Raking perspective'),
  ('mountain-ridge', '/artworks/gilded-ridge-room.jpg',     3, 'Mountain Ridge · In-situ scale placement'),

  ('tajalli',        '/artworks/tajalli-primary.jpg',       0, 'Tajalli · In-situ celestial presentation'),
  ('tajalli',        '/artworks/tajalli-detail.jpg',        1, 'Tajalli · Macro calligraphy & gold aura'),
  ('tajalli',        '/artworks/tajalli-angle.jpg',         2, 'Tajalli · Perspective raking angle'),

  ('nafs-e-rehmat',  '/artworks/nafs-e-rehmat-primary.jpg', 0, 'Nafs-e-Rehmat · In-situ diptych showcase'),
  ('nafs-e-rehmat',  '/artworks/nafs-e-rehmat-detail.jpg',  1, 'Nafs-e-Rehmat · Macro gold drip & Kufic relief'),
  ('nafs-e-rehmat',  '/artworks/nafs-e-rehmat-angle.jpg',   2, 'Nafs-e-Rehmat · Perspective raking angle'),

  ('tajdeed',        '/artworks/tajdeed-primary.jpg',       0, 'Tajdeed · In-situ architectural setting'),
  ('tajdeed',        '/artworks/tajdeed-detail.jpg',        1, 'Tajdeed · Macro chevron palette knife strokes'),
  ('tajdeed',        '/artworks/tajdeed-angle.jpg',         2, 'Tajdeed · Perspective raking angle'),

  ('ufaq-e-sukoon',  '/artworks/ufaq-e-sukoon-primary.jpg', 0, 'Ufaq-e-Sukoon · In-situ ambient lighting setting'),
  ('ufaq-e-sukoon',  '/artworks/ufaq-e-sukoon-detail.jpg',  1, 'Ufaq-e-Sukoon · Macro impasto ridges'),
  ('ufaq-e-sukoon',  '/artworks/ufaq-e-sukoon-angle.jpg',   2, 'Ufaq-e-Sukoon · Perspective raking angle'),

  ('sukoon-e-khak',  '/artworks/sukoon-e-khak-primary.jpg', 0, 'Sukoon-e-Khak · In-situ modernist interior'),
  ('sukoon-e-khak',  '/artworks/sukoon-e-khak-detail.jpg',  1, 'Sukoon-e-Khak · Macro terracotta block texture'),
  ('sukoon-e-khak',  '/artworks/sukoon-e-khak-angle.jpg',   2, 'Sukoon-e-Khak · Perspective raking angle'),

  ('iltija',         '/artworks/iltija-primary.jpg',        0, 'Iltija · In-situ framed gallery setting'),
  ('iltija',         '/artworks/iltija-detail.jpg',         1, 'Iltija · Macro thuluth calligraphy & gold band'),
  ('iltija',         '/artworks/iltija-angle.jpg',          2, 'Iltija · Perspective raking angle'),

  ('uns',            '/artworks/uns-primary.jpg',           0, 'Uns · In-situ sunlit console presentation'),
  ('uns',            '/artworks/uns-detail.jpg',            1, 'Uns · Macro sculpted coffee steam impasto'),
  ('uns',            '/artworks/uns-angle.jpg',             2, 'Uns · Perspective raking angle'),

  ('kursi-e-jalal',  '/artworks/kursi-e-jalal-primary.jpg', 0, 'Kursi-e-Jalal · In-situ salon setting'),
  ('kursi-e-jalal',  '/artworks/kursi-e-jalal-detail.jpg',  1, 'Kursi-e-Jalal · Macro cosmic brushwork & Allah relief'),
  ('kursi-e-jalal',  '/artworks/kursi-e-jalal-angle.jpg',   2, 'Kursi-e-Jalal · Perspective raking angle'),

  ('nuqoosh',        '/artworks/nuqoosh-primary.jpg',       0, 'Nuqoosh · In-situ gallery wall setting'),
  ('nuqoosh',        '/artworks/nuqoosh-detail.jpg',        1, 'Nuqoosh · Macro 3D impasto tablets'),
  ('nuqoosh',        '/artworks/nuqoosh-angle.jpg',         2, 'Nuqoosh · Perspective raking angle'),

  ('yusra',          '/artworks/yusra-primary.jpg',         0, 'Yusra · In-situ architectural showcase'),
  ('yusra',          '/artworks/yusra-detail.jpg',          1, 'Yusra · Macro seafoam waves & golden beach script'),
  ('yusra',          '/artworks/yusra-angle.jpg',           2, 'Yusra · Perspective raking angle'),

  ('madar',          '/artworks/madar-room.jpg',            0, 'Madar · Architectural gallery setting'),
  ('madar',          '/artworks/madar-detail.jpg',          1, 'Madar · Macro concentric gold spiral'),
  ('madar',          '/artworks/madar-angle.jpg',           2, 'Madar · Perspective raking angle'),
  ('madar',          '/artworks/madar-primary.jpg',         3, 'Madar · Clean full canvas')
) as v(slug, url, sort_order, alt)
join public.paintings p on p.slug = v.slug
where not exists (
  select 1 from public.painting_images i
  where i.painting_id = p.id and i.url = v.url
);

commit;
