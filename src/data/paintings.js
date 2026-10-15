/**
 * !!! PLACEHOLDER DATA !!!
 * Every painting below is a clearly marked placeholder until the real photos,
 * titles and sizes arrive from the client. Nothing here is real artwork.
 *
 * Each painting is a one-of-one original (no quantity). Shape mirrors the
 * future database: id, slug, title, description, price (PKR), widthCm,
 * heightCm, medium, year, images[], status ("available" | "sold"), featured.
 *
 * Counts: 12 total — 9 available, 3 sold, 4 featured (all featured are available).
 * Images live in /public/placeholders (regenerate with `npm run placeholders`).
 */
const DESCRIPTION =
  'PLACEHOLDER — sample description for a one-of-one original. Replace with the real story of this work once the client supplies it.'

const MOCK_IMAGES = {
  'placeholder-ember-field': '/placeholders/mock-ember-field.jpg',
  'placeholder-slow-gold': '/placeholders/mock-slow-gold.jpg',
  'placeholder-bronze-hour': '/placeholders/mock-bronze-hour.jpg',
  'placeholder-night-ledger': '/placeholders/mock-night-ledger.jpg',
  'placeholder-quiet-ridge': '/placeholders/mock-quiet-ridge.jpg',
  'placeholder-champagne-drift': '/placeholders/mock-champagne-drift.jpg',
  'placeholder-low-light': '/placeholders/mock-low-light.jpg',
  'placeholder-umber-study': '/placeholders/mock-umber-study.jpg',
  'placeholder-gilded-wake': '/placeholders/mock-gilded-wake.jpg',
  'placeholder-soft-iron': '/placeholders/mock-soft-iron.jpg',
  'placeholder-last-embers': '/placeholders/mock-last-embers.jpg',
  'placeholder-copper-tide': '/placeholders/mock-copper-tide.jpg',
}

const img = (slug, n) => [
  MOCK_IMAGES[slug] || `/placeholders/placeholder-${String(n).padStart(2, '0')}.svg`,
  MOCK_IMAGES[slug] || `/placeholders/placeholder-${String(n).padStart(2, '0')}-detail.svg`,
]

const paintings = [
  { id: 1, slug: 'placeholder-ember-field', title: 'Placeholder 01 · Ember Field', description: DESCRIPTION, price: 185000, widthCm: 90, heightCm: 120, medium: 'Oil on canvas', year: 2025, images: img('placeholder-ember-field', 1), status: 'available', featured: true },
  { id: 2, slug: 'placeholder-slow-gold', title: 'Placeholder 02 · Slow Gold', description: DESCRIPTION, price: 95000, widthCm: 60, heightCm: 80, medium: 'Acrylic on canvas', year: 2025, images: img('placeholder-slow-gold', 2), status: 'available', featured: false },
  { id: 3, slug: 'placeholder-bronze-hour', title: 'Placeholder 03 · Bronze Hour', description: DESCRIPTION, price: 240000, widthCm: 120, heightCm: 90, medium: 'Oil on canvas', year: 2024, images: img('placeholder-bronze-hour', 3), status: 'available', featured: true },
  { id: 4, slug: 'placeholder-night-ledger', title: 'Placeholder 04 · Night Ledger', description: DESCRIPTION, price: 130000, widthCm: 70, heightCm: 100, medium: 'Mixed media on canvas', year: 2024, images: img('placeholder-night-ledger', 4), status: 'sold', featured: false },
  { id: 5, slug: 'placeholder-quiet-ridge', title: 'Placeholder 05 · Quiet Ridge', description: DESCRIPTION, price: 75000, widthCm: 50, heightCm: 50, medium: 'Acrylic on canvas', year: 2025, images: img('placeholder-quiet-ridge', 5), status: 'available', featured: false },
  { id: 6, slug: 'placeholder-champagne-drift', title: 'Placeholder 06 · Champagne Drift', description: DESCRIPTION, price: 210000, widthCm: 100, heightCm: 100, medium: 'Oil on canvas', year: 2025, images: img('placeholder-champagne-drift', 6), status: 'available', featured: true },
  { id: 7, slug: 'placeholder-low-light', title: 'Placeholder 07 · Low Light', description: DESCRIPTION, price: 110000, widthCm: 80, heightCm: 60, medium: 'Oil on board', year: 2023, images: img('placeholder-low-light', 7), status: 'sold', featured: false },
  { id: 8, slug: 'placeholder-umber-study', title: 'Placeholder 08 · Umber Study', description: DESCRIPTION, price: 65000, widthCm: 40, heightCm: 60, medium: 'Acrylic on paper', year: 2024, images: img('placeholder-umber-study', 8), status: 'available', featured: false },
  { id: 9, slug: 'placeholder-gilded-wake', title: 'Placeholder 09 · Gilded Wake', description: DESCRIPTION, price: 320000, widthCm: 150, heightCm: 100, medium: 'Oil on canvas', year: 2025, images: img('placeholder-gilded-wake', 9), status: 'available', featured: true },
  { id: 10, slug: 'placeholder-soft-iron', title: 'Placeholder 10 · Soft Iron', description: DESCRIPTION, price: 88000, widthCm: 60, heightCm: 90, medium: 'Mixed media on canvas', year: 2024, images: img('placeholder-soft-iron', 10), status: 'available', featured: false },
  { id: 11, slug: 'placeholder-last-embers', title: 'Placeholder 11 · Last Embers', description: DESCRIPTION, price: 155000, widthCm: 90, heightCm: 90, medium: 'Oil on canvas', year: 2023, images: img('placeholder-last-embers', 11), status: 'sold', featured: false },
  { id: 12, slug: 'placeholder-copper-tide', title: 'Placeholder 12 · Copper Tide', description: DESCRIPTION, price: 142000, widthCm: 110, heightCm: 80, medium: 'Acrylic on canvas', year: 2025, images: img('placeholder-copper-tide', 12), status: 'available', featured: false },
]

export default paintings
