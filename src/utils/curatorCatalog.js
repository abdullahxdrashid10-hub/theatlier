/**
 * Curator Catalog Manifest Generator.
 * Provides a hyper-compressed, token-efficient catalog manifest (~300-400 tokens)
 * for the AI Art Concierge prompt context.
 *
 * Prevents token inflation by omitting high-res imagery, DOM elements, and long descriptions.
 */
import mockPaintings from '../data/paintings'

/**
 * Builds a compressed JSON manifest from a list of painting records.
 * Schema:
 * [
 *   {
 *     "s": "slug",
 *     "t": "Title",
 *     "p": 185000,
 *     "d": "120x90cm",
 *     "st": "available",
 *     "m": "Oil on Belgian Linen",
 *     "tags": "bronze,gold,chiaroscuro,statement,lounge"
 *   }
 * ]
 */
export function buildCatalogManifest(paintings = mockPaintings) {
  if (!Array.isArray(paintings)) return '[]'

  const manifest = paintings.map((p) => {
    // Generate semantic mood & color tags based on title, medium, and description
    const textBlob = `${p.title || ''} ${p.medium || ''} ${p.description || ''}`.toLowerCase()
    const tags = []

    if (textBlob.includes('gold') || textBlob.includes('gilded')) tags.push('gold')
    if (textBlob.includes('bronze')) tags.push('bronze')
    if (textBlob.includes('warm') || textBlob.includes('amber') || textBlob.includes('sienna')) tags.push('warm-tones')
    if (textBlob.includes('dark') || textBlob.includes('noir') || textBlob.includes('shadow') || textBlob.includes('chiaroscuro')) tags.push('chiaroscuro')
    if (textBlob.includes('impasto') || textBlob.includes('knife') || textBlob.includes('texture') || textBlob.includes('relief')) tags.push('heavy-impasto')
    if (textBlob.includes('mineral') || textBlob.includes('stone') || textBlob.includes('earth')) tags.push('earthy')
    if (textBlob.includes('minimal') || textBlob.includes('serene')) tags.push('minimalist')

    const width = p.widthCm || p.width_cm || 0
    const height = p.heightCm || p.height_cm || 0
    if (width >= 100 || height >= 100) tags.push('statement', 'grand-scale')
    else tags.push('intimate', 'study')

    return {
      s: p.slug,
      t: p.title,
      p: Number(p.price || p.price_pkr || 0),
      d: `${width}x${height}cm`,
      st: String(p.status || 'available').toLowerCase(),
      m: p.medium || 'Heavy Impasto Oil',
      tags: tags.join(','),
    }
  })

  return JSON.stringify(manifest)
}

/**
 * Returns starter advisory suggestion prompts for collectors.
 */
export const STARTER_SUGGESTIONS = [
  {
    id: 'statement',
    label: 'Recommend a statement piece for my living room',
    prompt: 'I am looking for an commanding statement artwork for a spacious modern living room. What would you recommend from the studio?',
  },
  {
    id: 'technique',
    label: 'Tell me about SK’s impasto knife technique',
    prompt: 'Could you explain SK’s physical painting technique, use of palette knives, and the texture of the impasto canvases?',
  },
  {
    id: 'palette',
    label: 'Browse artworks in warm bronze & gold tones',
    prompt: 'I am designing a space with warm, organic elements. Which paintings feature warm bronze, gold leaf, and deep umber tones?',
  },
  {
    id: 'budget',
    label: 'Explore paintings under PKR 200,000',
    prompt: 'Please show me available original works in the collection with an acquisition price under PKR 200,000.',
  },
]
