/**
 * Data access layer for The Atelier by SK.
 * Public read-only catalog access from Supabase with an in-memory TTL cache.
 * Mock data is only allowed in development when explicitly enabled via VITE_USE_MOCK_DATA.
 */
import mockPaintings from './paintings'
import { isSupabaseConfigured, supabase } from './supabaseClient'

const clone = (value) => structuredClone(value)

/** Typed error thrown when Supabase catalog is unreachable or encounters a query failure. */
export class CatalogUnavailableError extends Error {
  constructor(message = 'The Atelier catalog is currently unavailable. Please check your connection and try again.', cause) {
    super(message)
    this.name = 'CatalogUnavailableError'
    this.cause = cause
  }
}

/**
 * Check if development mock data is explicitly enabled.
 * HARD RULE: Ignored in production builds.
 */
export const isMockDataEnabled = () =>
  Boolean(import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_DATA === 'true')

/**
 * Universal mapper converting snake_case database records to frontend camelCase shape.
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

  let imagesList = sortedImages.length > 0 ? sortedImages : (row.images || [])
  if (row.slug) {
    const dimUrl = `/artworks/${row.slug}-dimension.jpg`
    imagesList = [dimUrl, ...imagesList.filter((u) => u !== dimUrl)]
  }

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
    images: imagesList,
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
    throw new CatalogUnavailableError('Unable to connect to the studio catalog database.')
  }

  const { data, error } = await supabase
    .from('paintings')
    .select('*, painting_images(url, sort_order, alt)')
    .order('featured', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    throw new CatalogUnavailableError('Failed to retrieve catalog paintings.', error)
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
    throw new CatalogUnavailableError('Unable to connect to the studio catalog database.')
  }

  const { data, error } = await supabase
    .from('paintings')
    .select('*, painting_images(url, sort_order, alt)')
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    throw new CatalogUnavailableError(`Failed to load painting "${slug}".`, error)
  }

  return mapPainting(data)
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
    throw new CatalogUnavailableError('Unable to connect to the studio catalog database.')
  }

  const { data, error } = await supabase
    .from('paintings')
    .select('*, painting_images(url, sort_order, alt)')
    .in('id', ids)

  if (error) {
    throw new CatalogUnavailableError('Failed to verify selected paintings with the catalog.', error)
  }

  return (data || []).map(mapPainting)
}

/**
 * Places an order via the secure Supabase place_order RPC function.
 * @param {object} order
 * @param {string[]} order.items - Array of painting UUIDs
 * @param {object} order.customer - { name, phone, email, city, address, notes }
 * @param {'cod'|'bank_transfer'} order.paymentMethod - 'cod' | 'bank_transfer'
 * @returns {Promise<{ order_id: string, reference: string, total_pkr: number, items: Array<{ painting_id: string, title: string, price_pkr: number }> }>}
 */
export async function submitOrder({ items, customer, paymentMethod }) {
  if (isMockDataEnabled()) {
    invalidateCatalogCache()
    return {
      order_id: 'mock-order-id',
      reference: 'ATL-MOCK01',
      total_pkr: 0,
      items: (items || []).map((id) => ({
        painting_id: id,
        title: 'Mock Artwork',
        price_pkr: 0,
      })),
    }
  }

  if (!isSupabaseConfigured || !supabase) {
    throw new CatalogUnavailableError('Unable to connect to the studio ordering system.')
  }

  const method = paymentMethod === 'bank' ? 'bank_transfer' : paymentMethod

  const { data, error } = await supabase.rpc('place_order', {
    p_items: items,
    p_customer: {
      name: customer.name?.trim() || '',
      phone: customer.phone?.trim() || '',
      email: customer.email?.trim() || null,
      city: customer.city?.trim() || '',
      address: customer.address?.trim() || '',
      notes: customer.notes?.trim() || null,
    },
    p_payment_method: method,
  })

  if (error) {
    const err = new Error(error.message || 'Failed to place order')
    err.code = error.code
    err.details = error.details || error.hint || error.message
    throw err
  }

  invalidateCatalogCache()
  return data
}
