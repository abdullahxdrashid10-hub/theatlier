-- =============================================================================
-- The Atelier by SK — Seed Dimension Staging Images for Shop
-- Run this in your Supabase SQL Editor to update all artwork gallery images.
-- =============================================================================

begin;

-- 1. Remove existing image records for the 13 authentic paintings
delete from public.painting_images
where painting_id in (
  select id from public.paintings
  where slug in (
    'al-asr',
    'mountain-ridge',
    'tajalli',
    'nafs-e-rehmat',
    'tajdeed',
    'ufaq-e-sukoon',
    'sukoon-e-khak',
    'iltija',
    'uns',
    'kursi-e-jalal',
    'nuqoosh',
    'yusra',
    'madar'
  )
);

-- 2. Insert all images with the new dimension image at sort_order 0 (Primary)
insert into public.painting_images (painting_id, url, storage_path, sort_order, alt)
select p.id, v.url, null, v.sort_order, v.alt
from (values
  -- 1. Al-Asr (36" × 48")
  ('al-asr',         '/artworks/al-asr-dimension.jpg',         0, 'Al-Asr · In-situ architectural scale view with dimensions'),
  ('al-asr',         '/artworks/al-asr-detail.jpg',            1, 'Al-Asr · Macro gold drip texture'),
  ('al-asr',         '/artworks/al-asr-angle.jpg',             2, 'Al-Asr · Raking perspective angle'),
  ('al-asr',         '/artworks/al-asr-primary.jpg',           3, 'Al-Asr · Full canvas frontal'),

  -- 2. Mountain Ridge (24" × 36")
  ('mountain-ridge', '/artworks/mountain-ridge-dimension.jpg', 0, 'Mountain Ridge · In-situ architectural scale view with dimensions'),
  ('mountain-ridge', '/artworks/gilded-ridge-detail.jpg',      1, 'Mountain Ridge · Impasto knife detail'),
  ('mountain-ridge', '/artworks/gilded-ridge-angle.jpg',       2, 'Mountain Ridge · Raking perspective angle'),
  ('mountain-ridge', '/artworks/gilded-ridge-primary.jpg',     3, 'Mountain Ridge · Full canvas frontal'),

  -- 3. Tajalli (36" × 48")
  ('tajalli',        '/artworks/tajalli-dimension.jpg',        0, 'Tajalli · In-situ celestial presentation with dimensions'),
  ('tajalli',        '/artworks/tajalli-detail.jpg',           1, 'Tajalli · Macro calligraphy & gold aura'),
  ('tajalli',        '/artworks/tajalli-angle.jpg',            2, 'Tajalli · Perspective raking angle'),
  ('tajalli',        '/artworks/tajalli-primary.jpg',          3, 'Tajalli · Full canvas frontal'),

  -- 4. Nafs-e-Rehmat (48" × 36")
  ('nafs-e-rehmat',  '/artworks/nafs-e-rehmat-dimension.jpg',  0, 'Nafs-e-Rehmat · In-situ diptych showcase with dimensions'),
  ('nafs-e-rehmat',  '/artworks/nafs-e-rehmat-detail.jpg',     1, 'Nafs-e-Rehmat · Macro gold drip & Kufic relief'),
  ('nafs-e-rehmat',  '/artworks/nafs-e-rehmat-angle.jpg',      2, 'Nafs-e-Rehmat · Perspective raking angle'),
  ('nafs-e-rehmat',  '/artworks/nafs-e-rehmat-primary.jpg',    3, 'Nafs-e-Rehmat · Full canvas frontal'),

  -- 5. Tajdeed (36" × 24")
  ('tajdeed',        '/artworks/tajdeed-dimension.jpg',        0, 'Tajdeed · In-situ architectural setting with dimensions'),
  ('tajdeed',        '/artworks/tajdeed-detail.jpg',           1, 'Tajdeed · Macro chevron palette knife strokes'),
  ('tajdeed',        '/artworks/tajdeed-angle.jpg',            2, 'Tajdeed · Perspective raking angle'),
  ('tajdeed',        '/artworks/tajdeed-primary.jpg',          3, 'Tajdeed · Full canvas frontal'),

  -- 6. Ufaq-e-Sukoon (36" × 24")
  ('ufaq-e-sukoon',  '/artworks/ufaq-e-sukoon-dimension.jpg',  0, 'Ufaq-e-Sukoon · In-situ ambient lighting setting with dimensions'),
  ('ufaq-e-sukoon',  '/artworks/ufaq-e-sukoon-detail.jpg',     1, 'Ufaq-e-Sukoon · Macro impasto ridges'),
  ('ufaq-e-sukoon',  '/artworks/ufaq-e-sukoon-angle.jpg',      2, 'Ufaq-e-Sukoon · Perspective raking angle'),
  ('ufaq-e-sukoon',  '/artworks/ufaq-e-sukoon-primary.jpg',    3, 'Ufaq-e-Sukoon · Full canvas frontal'),

  -- 7. Sukoon-e-Khak (36" × 24")
  ('sukoon-e-khak',  '/artworks/sukoon-e-khak-dimension.jpg',  0, 'Sukoon-e-Khak · In-situ modernist interior with dimensions'),
  ('sukoon-e-khak',  '/artworks/sukoon-e-khak-detail.jpg',     1, 'Sukoon-e-Khak · Macro terracotta block texture'),
  ('sukoon-e-khak',  '/artworks/sukoon-e-khak-angle.jpg',      2, 'Sukoon-e-Khak · Perspective raking angle'),
  ('sukoon-e-khak',  '/artworks/sukoon-e-khak-primary.jpg',    3, 'Sukoon-e-Khak · Full canvas frontal'),

  -- 8. Iltija (24" × 36")
  ('iltija',         '/artworks/iltija-dimension.jpg',         0, 'Iltija · In-situ framed gallery setting with dimensions'),
  ('iltija',         '/artworks/iltija-detail.jpg',            1, 'Iltija · Macro thuluth calligraphy & gold band'),
  ('iltija',         '/artworks/iltija-angle.jpg',             2, 'Iltija · Perspective raking angle'),
  ('iltija',         '/artworks/iltija-primary.jpg',           3, 'Iltija · Full canvas frontal'),

  -- 9. Uns (24" × 24")
  ('uns',            '/artworks/uns-dimension.jpg',            0, 'Uns · In-situ sunlit console presentation with dimensions'),
  ('uns',            '/artworks/uns-detail.jpg',               1, 'Uns · Macro sculpted coffee steam impasto'),
  ('uns',            '/artworks/uns-angle.jpg',                2, 'Uns · Perspective raking angle'),
  ('uns',            '/artworks/uns-primary.jpg',              3, 'Uns · Full canvas frontal'),

  -- 10. Kursi-e-Jalal (42" × 36")
  ('kursi-e-jalal',  '/artworks/kursi-e-jalal-dimension.jpg',  0, 'Kursi-e-Jalal · In-situ salon setting with dimensions'),
  ('kursi-e-jalal',  '/artworks/kursi-e-jalal-detail.jpg',     1, 'Kursi-e-Jalal · Macro cosmic brushwork & Allah relief'),
  ('kursi-e-jalal',  '/artworks/kursi-e-jalal-angle.jpg',      2, 'Kursi-e-Jalal · Perspective raking angle'),
  ('kursi-e-jalal',  '/artworks/kursi-e-jalal-primary.jpg',    3, 'Kursi-e-Jalal · Full canvas frontal'),

  -- 11. Nuqoosh (36" × 24")
  ('nuqoosh',        '/artworks/nuqoosh-dimension.jpg',        0, 'Nuqoosh · In-situ gallery wall setting with dimensions'),
  ('nuqoosh',        '/artworks/nuqoosh-detail.jpg',           1, 'Nuqoosh · Macro 3D impasto tablets'),
  ('nuqoosh',        '/artworks/nuqoosh-angle.jpg',            2, 'Nuqoosh · Perspective raking angle'),
  ('nuqoosh',        '/artworks/nuqoosh-primary.jpg',          3, 'Nuqoosh · Full canvas frontal'),

  -- 12. Yusra (24" × 36")
  ('yusra',          '/artworks/yusra-dimension.jpg',          0, 'Yusra · In-situ architectural showcase with dimensions'),
  ('yusra',          '/artworks/yusra-detail.jpg',             1, 'Yusra · Macro seafoam waves & golden beach script'),
  ('yusra',          '/artworks/yusra-angle.jpg',              2, 'Yusra · Perspective raking angle'),
  ('yusra',          '/artworks/yusra-primary.jpg',            3, 'Yusra · Full canvas frontal'),

  -- 13. Madar (36" × 24")
  ('madar',          '/artworks/madar-dimension.jpg',          0, 'Madar · Architectural gallery setting with dimensions'),
  ('madar',          '/artworks/madar-detail.jpg',             1, 'Madar · Macro concentric gold spiral'),
  ('madar',          '/artworks/madar-angle.jpg',              2, 'Madar · Perspective raking angle'),
  ('madar',          '/artworks/madar-primary.jpg',            3, 'Madar · Clean full canvas')
) as v(slug, url, sort_order, alt)
join public.paintings p on p.slug = v.slug;

commit;

-- Verification check: returns 13 rows with the new dimension image as primary
select p.title, p.slug, pi.url, pi.sort_order
from public.paintings p
join public.painting_images pi on pi.painting_id = p.id
where pi.sort_order = 0
order by p.featured desc, p.title asc;
