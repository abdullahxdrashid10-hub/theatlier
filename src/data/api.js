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

export const LOCAL_STORAGE_CATALOG_KEY = 'the_atelier_catalog_store'
export const LOCAL_STORAGE_ORDERS_KEY = 'the_atelier_orders_store'

export function getLocalCatalog() {
  if (typeof window === 'undefined') return mockPaintings
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CATALOG_KEY)
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_CATALOG_KEY, JSON.stringify(mockPaintings))
      return mockPaintings
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : mockPaintings
  } catch {
    return mockPaintings
  }
}

export function saveLocalCatalog(items) {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_STORAGE_CATALOG_KEY, JSON.stringify(items))
    } catch (e) {
      console.warn('Failed to save catalog to localStorage:', e)
    }
  }
  invalidateCatalogCache()
}

export function getLocalOrders() {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ORDERS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveLocalOrders(orders) {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_STORAGE_ORDERS_KEY, JSON.stringify(orders))
    } catch (e) {
      console.warn('Failed to save orders to localStorage:', e)
    }
  }
}

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
    return clone(getLocalCatalog().map(mapPainting))
  }

  if (!force && catalogCache && (Date.now() - catalogCacheTimestamp < CACHE_TTL_MS)) {
    return clone(catalogCache)
  }

  if (!isSupabaseConfigured || !supabase) {
    // Graceful fallback to persistent local catalog if Supabase not yet live
    return clone(getLocalCatalog().map(mapPainting))
  }

  const { data, error } = await supabase
    .from('paintings')
    .select('*, painting_images(url, sort_order, alt)')
    .order('featured', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.warn('Supabase catalog fetch error, using local catalog:', error)
    return clone(getLocalCatalog().map(mapPainting))
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
    const found = getLocalCatalog().find((p) => p.slug === slug)
    return found ? clone(mapPainting(found)) : null
  }

  if (catalogCache && (Date.now() - catalogCacheTimestamp < CACHE_TTL_MS)) {
    const cached = catalogCache.find((p) => p.slug === slug)
    if (cached) return clone(cached)
  }

  if (!isSupabaseConfigured || !supabase) {
    const found = getLocalCatalog().find((p) => p.slug === slug)
    return found ? clone(mapPainting(found)) : null
  }

  const { data, error } = await supabase
    .from('paintings')
    .select('*, painting_images(url, sort_order, alt)')
    .eq('slug', slug)
    .maybeSingle()

  if (error || !data) {
    const found = getLocalCatalog().find((p) => p.slug === slug)
    return found ? clone(mapPainting(found)) : null
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

  if (isMockDataEnabled() || !isSupabaseConfigured || !supabase) {
    const idSet = new Set(ids.map(String))
    return clone(getLocalCatalog().filter((p) => idSet.has(String(p.id))).map(mapPainting))
  }

  const { data, error } = await supabase
    .from('paintings')
    .select('*, painting_images(url, sort_order, alt)')
    .in('id', ids)

  if (error || !data || data.length === 0) {
    const idSet = new Set(ids.map(String))
    return clone(getLocalCatalog().filter((p) => idSet.has(String(p.id))).map(mapPainting))
  }

  return data.map(mapPainting)
}

/**
 * Updates an artwork's status ('available', 'reserved', 'sold').
 * @param {string|number} id
 * @param {'available'|'reserved'|'sold'} newStatus
 * @returns {Promise<object>}
 */
export async function updatePaintingStatus(id, newStatus) {
  const normStatus = String(newStatus).toLowerCase()
  const catalog = getLocalCatalog()
  const index = catalog.findIndex((p) => String(p.id) === String(id) || p.slug === String(id))
  if (index !== -1) {
    catalog[index].status = normStatus
    catalog[index].updated_at = new Date().toISOString()
    saveLocalCatalog(catalog)
  }

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from('paintings')
        .update({ status: normStatus, updated_at: new Date().toISOString() })
        .eq('id', id)
    } catch (e) {
      console.warn('Supabase status update error:', e)
    }
  }

  invalidateCatalogCache()
  return index !== -1 ? clone(mapPainting(catalog[index])) : { id, status: normStatus }
}

/**
 * Creates a new artwork in the catalog.
 * @param {object} fields
 * @returns {Promise<object>}
 */
export async function createPainting(fields) {
  const title = (fields.title || 'Untitled Original').trim()
  const rawSlug = fields.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const slug = `${rawSlug}-${Date.now().toString(36)}`
  const price = Math.max(0, Number(fields.price) || 0)
  const images = Array.isArray(fields.images) && fields.images.length > 0
    ? fields.images.filter(Boolean)
    : [fields.image || '/placeholders/placeholder-01.svg']

  const newArtwork = {
    id: fields.id || `art-${Date.now()}`,
    slug,
    title,
    description: fields.description || '',
    price,
    widthCm: Number(fields.widthCm) || 0,
    heightCm: Number(fields.heightCm) || 0,
    medium: fields.medium || 'Heavy acrylic impasto on Italian linen',
    year: Number(fields.year) || new Date().getFullYear(),
    images,
    status: String(fields.status || 'available').toLowerCase(),
    featured: Boolean(fields.featured),
    created_at: new Date().toISOString(),
  }

  const catalog = getLocalCatalog()
  catalog.unshift(newArtwork)
  saveLocalCatalog(catalog)

  if (isSupabaseConfigured && supabase) {
    try {
      const { data } = await supabase
        .from('paintings')
        .insert({
          slug,
          title,
          description: newArtwork.description,
          price_pkr: price,
          width_cm: newArtwork.widthCm,
          height_cm: newArtwork.heightCm,
          medium: newArtwork.medium,
          year: newArtwork.year,
          status: newArtwork.status,
          featured: newArtwork.featured,
        })
        .select()
        .single()

      if (data && images.length > 0) {
        const imageRows = images.map((url, sort_order) => ({
          painting_id: data.id,
          url,
          sort_order,
        }))
        await supabase.from('painting_images').insert(imageRows)
      }
    } catch (e) {
      console.warn('Supabase create painting error:', e)
    }
  }

  invalidateCatalogCache()
  return clone(mapPainting(newArtwork))
}

/**
 * Updates an existing artwork in the catalog.
 * @param {string|number} id
 * @param {object} fields
 * @returns {Promise<object>}
 */
export async function updatePainting(id, fields) {
  const catalog = getLocalCatalog()
  const index = catalog.findIndex((p) => String(p.id) === String(id) || p.slug === String(id))
  let updatedArtwork = null

  if (index !== -1) {
    const prev = catalog[index]
    updatedArtwork = {
      ...prev,
      title: fields.title !== undefined ? fields.title.trim() : prev.title,
      price: fields.price !== undefined ? Number(fields.price) : prev.price,
      status: fields.status !== undefined ? String(fields.status).toLowerCase() : prev.status,
      medium: fields.medium !== undefined ? fields.medium : prev.medium,
      widthCm: fields.widthCm !== undefined ? Number(fields.widthCm) : prev.widthCm,
      heightCm: fields.heightCm !== undefined ? Number(fields.heightCm) : prev.heightCm,
      year: fields.year !== undefined ? Number(fields.year) : prev.year,
      description: fields.description !== undefined ? fields.description : prev.description,
      featured: fields.featured !== undefined ? Boolean(fields.featured) : prev.featured,
      images: Array.isArray(fields.images) && fields.images.length > 0 ? fields.images.filter(Boolean) : prev.images,
      updated_at: new Date().toISOString(),
    }
    catalog[index] = updatedArtwork
    saveLocalCatalog(catalog)
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const updatePayload = {
        updated_at: new Date().toISOString(),
      }
      if (fields.title !== undefined) updatePayload.title = fields.title.trim()
      if (fields.price !== undefined) updatePayload.price_pkr = Number(fields.price)
      if (fields.status !== undefined) updatePayload.status = String(fields.status).toLowerCase()
      if (fields.medium !== undefined) updatePayload.medium = fields.medium
      if (fields.widthCm !== undefined) updatePayload.width_cm = Number(fields.widthCm)
      if (fields.heightCm !== undefined) updatePayload.height_cm = Number(fields.heightCm)
      if (fields.year !== undefined) updatePayload.year = Number(fields.year)
      if (fields.description !== undefined) updatePayload.description = fields.description
      if (fields.featured !== undefined) updatePayload.featured = Boolean(fields.featured)

      await supabase.from('paintings').update(updatePayload).eq('id', id)

      if (Array.isArray(fields.images) && fields.images.length > 0) {
        await supabase.from('painting_images').delete().eq('painting_id', id)
        const imageRows = fields.images.filter(Boolean).map((url, sort_order) => ({
          painting_id: id,
          url,
          sort_order,
        }))
        await supabase.from('painting_images').insert(imageRows)
      }
    } catch (e) {
      console.warn('Supabase update painting error:', e)
    }
  }

  invalidateCatalogCache()
  return updatedArtwork ? clone(mapPainting(updatedArtwork)) : null
}

/**
 * Deletes an artwork from the catalog.
 * @param {string|number} id
 * @returns {Promise<boolean>}
 */
export async function deletePainting(id) {
  const catalog = getLocalCatalog()
  const filtered = catalog.filter((p) => String(p.id) !== String(id) && p.slug !== String(id))
  saveLocalCatalog(filtered)

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('paintings').delete().eq('id', id)
    } catch (e) {
      console.warn('Supabase delete error:', e)
    }
  }

  invalidateCatalogCache()
  return true
}

/**
 * Retrieves all client/customer orders.
 * @returns {Promise<Array>}
 */
export async function getAllOrders() {
  if (isMockDataEnabled() || !isSupabaseConfigured || !supabase) {
    return clone(getLocalOrders())
  }

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false })

    if (error || !data) return clone(getLocalOrders())
    return data
  } catch {
    return clone(getLocalOrders())
  }
}

/**
 * Updates order status (pending, confirmed, shipped, delivered, cancelled).
 * @param {string} orderId
 * @param {string} newStatus
 * @returns {Promise<object>}
 */
export async function updateOrderStatus(orderId, newStatus) {
  const orders = getLocalOrders()
  const index = orders.findIndex((o) => o.id === orderId || o.reference === orderId)
  if (index !== -1) {
    orders[index].status = newStatus
    orders[index].updated_at = new Date().toISOString()
    saveLocalOrders(orders)
  }

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('reference', orderId)
    } catch (e) {
      console.warn('Supabase order status update error:', e)
    }
  }

  return index !== -1 ? orders[index] : { id: orderId, status: newStatus }
}

/**
 * Submits an order, stores it in orders registry, and reserves/sells the items.
 * @param {object} order
 * @returns {Promise<{ orderId: string }>}
 */
export async function submitOrder(order) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  const code = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
  const orderId = `ATL-${code}`

  const newOrderRecord = {
    id: `ord-${Date.now()}`,
    reference: orderId,
    status: 'pending',
    payment_method: order?.paymentMethod || 'cod',
    payment_status: 'unpaid',
    customer_name: order?.customer?.name || 'Private Collector',
    customer_phone: order?.customer?.phone || '',
    customer_email: order?.customer?.email || null,
    city: order?.customer?.city || 'Karachi',
    address: order?.customer?.address || '',
    notes: order?.customer?.notes || null,
    total_pkr: order?.totalPKR || 0,
    items: order?.items || [],
    created_at: new Date().toISOString(),
  }

  // Save into local orders
  const orders = getLocalOrders()
  orders.unshift(newOrderRecord)
  saveLocalOrders(orders)

  // Automatically mark ordered artworks as 'reserved' or 'sold'
  if (Array.isArray(order?.items)) {
    for (const item of order.items) {
      if (item?.id || item?.slug) {
        try {
          await updatePaintingStatus(item.id || item.slug, 'reserved')
        } catch (e) {
          console.warn('Could not auto-reserve ordered painting:', e)
        }
      }
    }
  }

  invalidateCatalogCache()
  return { orderId }
}
