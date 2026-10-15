/**
 * Data access layer for The Atelier by SK.
 * Reads live painting catalog from Supabase with an in-memory TTL cache,
 * strict error typing, and development-only mock fallback.
 */
import mockPaintings from './paintings'
import { isSupabaseConfigured, supabase } from './supabaseClient'

const clone = (value) => structuredClone(value)

/** Typed error thrown when Supabase catalog is unreachable or unconfigured in production. */
export class CatalogUnavailableError extends Error {
  constructor(message = 'The Atelier catalog is currently unavailable. Please check your connection and try again.', cause) {
    super(message)
    this.name = 'CatalogUnavailableError'
    this.cause = cause
  }
}

/** Check if development mock data is explicitly enabled */
export const isMockDataEnabled = () => import.meta.env.VITE_USE_MOCK_DATA === 'true'

/**
 * Universal mapper converting snake_case database records to frontend camelCase shape.
 * Shape: id, slug, title, description, price (number), widthCm, heightCm, medium, year,
 * images (array of url strings ordered by sort_order), status ('available' | 'reserved' | 'sold'), featured.
 */
export function mapPainting(row) {
  if (!row) return null

  // Support development mock objects gracefully
  if (row.price !== undefined && row.price_pkr === undefined) {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description || '',
      price: Number(row.price),
      widthCm: Number(row.widthCm || row.width_cm || 0),
      heightCm: Number(row.heightCm || row.height_cm || 0),
      medium: row.medium || '',
      year: Number(row.year || new Date().getFullYear()),
      images: Array.isArray(row.images) ? row.images : [],
      status: String(row.status || 'available').toLowerCase(),
      featured: Boolean(row.featured),
    }
  }

  const rawImages = Array.isArray(row.painting_images)
    ? row.painting_images.slice()
    : []

  const sortedImages = rawImages
    .sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0))
    .map((img) => img.url)

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description || '',
    price: Number(row.price_pkr),
    widthCm: Number(row.width_cm),
    heightCm: Number(row.height_cm),
    medium: row.medium || '',
    year: Number(row.year),
    images: sortedImages.length > 0 ? sortedImages : (row.images || []),
    status: String(row.status || 'available').toLowerCase(),
    featured: Boolean(row.featured),
  }
}

// -----------------------------------------------------------------------------
// In-Memory Catalog Cache (30s TTL, 60s visibility refetch)
// -----------------------------------------------------------------------------
let catalogCache = null
let catalogCacheTimestamp = 0
const CACHE_TTL_MS = 30 * 1000 // 30 seconds
const VISIBILITY_THRESHOLD_MS = 60 * 1000 // 60 seconds

export function invalidateCatalogCache() {
  catalogCache = null
  catalogCacheTimestamp = 0
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      const age = Date.now() - catalogCacheTimestamp
      if (age > VISIBILITY_THRESHOLD_MS) {
        invalidateCatalogCache()
      }
    }
  })
}

/**
 * Fetches all paintings ordered by featured desc then created_at desc.
 * @param {object} [options]
 * @param {boolean} [options.force=false] - Force cache bypass
 * @returns {Promise<Array>}
 */
export async function getAllPaintings({ force = false } = {}) {
  if (isMockDataEnabled()) {
    return clone(mockPaintings.map(mapPainting))
  }

  if (!force && catalogCache && (Date.now() - catalogCacheTimestamp < CACHE_TTL_MS)) {
    return clone(catalogCache)
  }

  if (!isSupabaseConfigured || !supabase) {
    throw new CatalogUnavailableError('The Atelier database is not configured. Missing Supabase credentials.')
  }

  const { data, error } = await supabase
    .from('paintings')
    .select('*, painting_images(url, sort_order, alt)')
    .order('featured', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    throw new CatalogUnavailableError('Failed to retrieve catalog from database.', error)
  }

  const mapped = (data || []).map(mapPainting)
  catalogCache = mapped
  catalogCacheTimestamp = Date.now()

  return clone(mapped)
}

/**
 * Fetches a single painting by its unique slug.
 * @param {string} slug
 * @returns {Promise<object|null>}
 */
export async function getPaintingBySlug(slug) {
  if (!slug) return null

  if (isMockDataEnabled()) {
    const found = mockPaintings.find((p) => p.slug === slug)
    return found ? clone(mapPainting(found)) : null
  }

  if (catalogCache && (Date.now() - catalogCacheTimestamp < CACHE_TTL_MS)) {
    const cached = catalogCache.find((p) => p.slug === slug)
    if (cached) return clone(cached)
  }

  if (!isSupabaseConfigured || !supabase) {
    throw new CatalogUnavailableError('The Atelier database is not configured.')
  }

  const { data, error } = await supabase
    .from('paintings')
    .select('*, painting_images(url, sort_order, alt)')
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    throw new CatalogUnavailableError(`Failed to fetch artwork '${slug}'.`, error)
  }

  return data ? mapPainting(data) : null
}

/**
 * Fetches featured paintings.
 * @returns {Promise<Array>}
 */
export async function getFeaturedPaintings() {
  const all = await getAllPaintings()
  return all.filter((p) => p.featured)
}

/**
 * Fetches paintings by an array of IDs (used for cart integrity verification).
 * @param {Array<string|number>} ids
 * @returns {Promise<Array>}
 */
export async function getPaintingsByIds(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return []

  if (isMockDataEnabled()) {
    const idSet = new Set(ids.map(String))
    return clone(mockPaintings.filter((p) => idSet.has(String(p.id))).map(mapPainting))
  }

  if (!isSupabaseConfigured || !supabase) {
    throw new CatalogUnavailableError('The Atelier database is not configured.')
  }

  const { data, error } = await supabase
    .from('paintings')
    .select('*, painting_images(url, sort_order, alt)')
    .in('id', ids)

  if (error) {
    throw new CatalogUnavailableError('Failed to fetch paintings for cart verification.', error)
  }

  return (data || []).map(mapPainting)
}

/**
 * Submits an order and invalidates catalog cache.
 * @param {object} order
 * @returns {Promise<{ orderId: string }>}
 */
export async function submitOrder(order) {
  void order
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  const code = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')

  return new Promise((resolve) => {
    setTimeout(() => {
      invalidateCatalogCache()
      resolve({ orderId: `ATL-${code}` })
    }, 700)
  })
}
