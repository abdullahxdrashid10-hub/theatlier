/**
 * Authentic catalog artworks for The Atelier by SK.
 * Only client-supplied artworks with real primary photos are kept here.
 * Disallowed descriptors (24K, sculptural, impasto, sacred, linen, heavy, titanium white, genuine) have been removed.
 * Unconfirmed client fields are explicitly tagged with // CONFIRM WITH CLIENT.
 */
const paintings = [
  {
    id: '226ae6d8-71d6-42a7-a477-d85bf081c12c',
    slug: 'al-asr', // CONFIRM WITH CLIENT
    title: 'Al-Asr', // CONFIRM WITH CLIENT
    description: 'Calligraphy combining painted and textured techniques on canvas.',
    price: 285000, // CONFIRM WITH CLIENT
    widthCm: 90, // CONFIRM WITH CLIENT
    heightCm: 120, // CONFIRM WITH CLIENT
    medium: 'Textured calligraphy on canvas',
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
    id: 'f60d727c-6dfa-433e-af23-feb4b6f37b21',
    slug: 'mountain-ridge', // CONFIRM WITH CLIENT
    title: 'Mountain Ridge', // CONFIRM WITH CLIENT
    description: 'Mountain landscape painted with brushes and palette knives on canvas with textured details.',
    price: 195000, // CONFIRM WITH CLIENT
    widthCm: 80, // CONFIRM WITH CLIENT
    heightCm: 120, // CONFIRM WITH CLIENT
    medium: 'Mixed media on canvas',
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
]

export default paintings
