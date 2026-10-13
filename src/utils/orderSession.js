/**
 * Hands the placed order summary to the confirmation page via sessionStorage.
 * Only the order id, items, total and payment method are stored — never the
 * customer's contact details.
 */
const KEY = 'atelier_last_order'

export function saveOrderSummary(summary) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(summary))
  } catch (err) {
    console.error('Could not store order summary:', err)
  }
}

export function readOrderSummary() {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
