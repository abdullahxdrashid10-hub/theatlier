/**
 * Cart storage layer for The Atelier by SK.
 * Persists one-of-a-kind original paintings to localStorage.
 *
 * Rules:
 * 1. Each artwork is an original 1-of-1: no duplicates allowed.
 * 2. Sold works CANNOT be added to the cart under any circumstance.
 */

const STORAGE_KEY = 'atelier_cart_items'
const EVENT_KEY = 'atelier:cart-change'

export function getCartItems() {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch (err) {
    console.error('Failed to read cart from localStorage:', err)
    return []
  }
}

export function addToCart(painting) {
  if (!painting) return { success: false, reason: 'invalid' }

  // Strictly enforce that sold works cannot be added to the cart
  if (painting.status === 'sold') {
    return {
      success: false,
      reason: 'sold',
      message: 'This piece has been acquired and is in a private collection.',
    }
  }

  const current = getCartItems()
  const exists = current.some((item) => item.id === painting.id || item.slug === painting.slug)
  if (exists) {
    return {
      success: false,
      reason: 'duplicate',
      message: 'This original one-of-one artwork is already in your acquisition list.',
    }
  }

  const updated = [...current, painting]
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: { items: updated } }))
    return { success: true, items: updated }
  } catch (err) {
    console.error('Failed to save to cart:', err)
    return { success: false, reason: 'storage_error', message: 'Could not update acquisition list.' }
  }
}

export function removeFromCart(paintingId) {
  const current = getCartItems()
  const updated = current.filter((item) => item.id !== paintingId)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: { items: updated } }))
    return updated
  } catch (err) {
    console.error('Failed to remove from cart:', err)
    return current
  }
}

export function isInCart(paintingId) {
  const current = getCartItems()
  return current.some((item) => item.id === paintingId)
}

export function getCartCount() {
  return getCartItems().length
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
