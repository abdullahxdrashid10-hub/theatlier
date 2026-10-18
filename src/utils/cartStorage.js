/**
 * Cart storage layer for The Atelier by SK.
 * Strictly stores ONLY an array of painting UUIDs in sessionStorage.
 * Never stores catalog records, prices, titles, or customer details.
 *
 * Rules:
 * 1. Each artwork is an original 1-of-1: no duplicates allowed.
 * 2. Sold or reserved works cannot be added to the cart.
 * 3. The cart stores painting UUIDs only.
 */

const STORAGE_KEY = 'atelier_cart_uuids'
const EVENT_KEY = 'atelier:cart-change'

export function getCartUuids() {
  if (typeof window === 'undefined') return []
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (err) {
    console.error('Failed to read cart UUIDs from session storage:', err)
    return []
  }
}

/**
 * Returns cart items as [{ id: uuid }].
 */
export function getCartItems() {
  return getCartUuids().map((id) => ({ id }))
}

export function addToCart(paintingOrId) {
  if (!paintingOrId) return { success: false, reason: 'invalid' }

  const id = typeof paintingOrId === 'string' ? paintingOrId : paintingOrId.id
  if (!id) return { success: false, reason: 'invalid' }

  // Strictly enforce that sold or reserved works cannot be added
  if (typeof paintingOrId === 'object' && paintingOrId !== null) {
    const status = String(paintingOrId.status || '').toLowerCase()
    if (status === 'sold' || status === 'reserved') {
      return {
        success: false,
        reason: status,
        message: status === 'sold' ? 'This piece has found its home.' : 'This piece is currently reserved.',
      }
    }
  }

  const currentUuids = getCartUuids()
  if (currentUuids.includes(id)) {
    return {
      success: false,
      reason: 'duplicate',
      message: 'This original one-of-one artwork is already in your acquisition list.',
    }
  }

  const updated = [...currentUuids, id]
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    const formatted = updated.map((itemUuid) => ({ id: itemUuid }))
    window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: { items: formatted } }))
    return { success: true, items: formatted }
  } catch (err) {
    console.error('Failed to save to cart storage:', err)
    return { success: false, reason: 'storage_error', message: 'Could not update acquisition list.' }
  }
}

export function removeFromCart(paintingId) {
  const current = getCartUuids()
  const updated = current.filter((id) => id !== paintingId)
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    const formatted = updated.map((id) => ({ id }))
    window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: { items: formatted } }))
    return formatted
  } catch (err) {
    console.error('Failed to remove from cart storage:', err)
    return current.map((id) => ({ id }))
  }
}

export function isInCart(paintingId) {
  if (!paintingId) return false
  const current = getCartUuids()
  return current.includes(paintingId)
}

export function getCartCount() {
  return getCartUuids().length
}

export function subscribeToCart(callback) {
  if (typeof window === 'undefined') return () => {}
  const handler = () => {
    callback(getCartItems())
  }
  window.addEventListener(EVENT_KEY, handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener(EVENT_KEY, handler)
    window.removeEventListener('storage', handler)
  }
}

export function clearCart() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([]))
    window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: { items: [] } }))
  } catch (err) {
    console.error('Failed to clear cart storage:', err)
  }
}
