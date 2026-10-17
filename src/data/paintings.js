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
const paintings = [
  {
    id: 1,
    slug: 'al-asr-the-golden-hour',
    title: 'Al-Asr · The Golden Hour',
    description: 'Surah Al-Asr rendered in sculptural 3D relief calligraphy gilded in genuine gold leaf. Layered atop a deep midnight noir canvas with an organic dripping gold leaf canopy and delicate metallic drift. A bespoke one-of-one statement of sacred elegance and timeless contemplation.',
    price: 285000,
    widthCm: 90,
    heightCm: 120,
    medium: '3D Relief Calligraphy & 24K Gold Leaf on Canvas',
    year: 2025,
    images: [
      '/artworks/al-asr-primary.jpg',
      '/artworks/al-asr-detail.jpg',
      '/artworks/al-asr-angle.jpg',
      '/artworks/al-asr-room.jpg',
    ],
    status: 'available',
    featured: true,
  },
  {
    id: 2,
    slug: 'gilded-ridge-celestial-peak',
    title: 'Gilded Ridge · Celestial Peak',
    description: 'Sculptural impasto palette knife peaks rendered in crisp titanium white and deep slate shadow, crowned with hand-applied 24K gold foil ridges beneath a suspended golden sun. Heavy tactile texture, rich sculptural depth, and radiant metallic presence.',
    price: 195000,
    widthCm: 80,
    heightCm: 120,
    medium: 'Heavy Impasto Palette Knife & 24K Gold Leaf on Canvas',
    year: 2025,
    images: [
      '/artworks/gilded-ridge-primary.jpg',
      '/artworks/gilded-ridge-detail.jpg',
      '/artworks/gilded-ridge-angle.jpg',
      '/artworks/gilded-ridge-room.jpg',
    ],
    status: 'available',
    featured: true,
  },
  {
    id: 3,
    slug: 'atelier-original-iii',
    title: 'Atelier Original · Forthcoming Work III',
    description: 'Original one-of-one canvas currently being documented in the studio. Handcrafted with bespoke textured layers and genuine metallic leaf.',
    price: 165000,
    widthCm: 75,
    heightCm: 100,
    medium: 'Mixed Media & Gold Leaf on Linen Canvas',
    year: 2025,
    images: [
      '/placeholders/mock-bronze-hour.jpg',
      '/placeholders/placeholder-03-detail.svg',
    ],
    status: 'available',
    featured: false,
  },
  {
    id: 4,
    slug: 'atelier-original-iv',
    title: 'Atelier Original · Forthcoming Work IV',
    description: 'Original one-of-one canvas currently being documented in the studio. Handcrafted with bespoke textured layers and genuine metallic leaf.',
    price: 210000,
    widthCm: 90,
    heightCm: 90,
    medium: 'Oil & 24K Gold Leaf on Canvas',
    year: 2025,
    images: [
      '/placeholders/mock-gilded-wake.jpg',
      '/placeholders/placeholder-09-detail.svg',
    ],
    status: 'available',
    featured: false,
  },
]

export default paintings

