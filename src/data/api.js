/**
 * Data access layer. The UI must read painting data ONLY through these functions.
 * They return Promises (and deep copies) so that Phase 2 can swap the mock array
 * for real fetch() calls without any UI changes.
 */
import paintings from './paintings'

const clone = (value) => structuredClone(value)

/** @returns {Promise<Array>} every painting */
export function getAllPaintings() {
  return Promise.resolve(clone(paintings))
}

/** @returns {Promise<object|null>} the painting with this slug, or null if none */
export function getPaintingBySlug(slug) {
  const found = paintings.find((painting) => painting.slug === slug)
  return Promise.resolve(found ? clone(found) : null)
}

/** @returns {Promise<Array>} paintings flagged featured */
export function getFeaturedPaintings() {
  return Promise.resolve(clone(paintings.filter((painting) => painting.featured)))
}

/**
 * Submits a customer order.
 * TODO (Phase 2): replace this stub with a real API call (POST /api/orders).
 * Currently it persists NOTHING and just resolves with a generated order id after 700 ms.
 *
 * @param {object} order - { customer, paymentMethod, items, totalPKR }
 * @returns {Promise<{ orderId: string }>}
 */
export function submitOrder(order) {
  void order
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  const code = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
  return new Promise((resolve) => {
    setTimeout(() => resolve({ orderId: `ATL-${code}` }), 700)
  })
}

