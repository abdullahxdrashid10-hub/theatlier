/**
 * Format a number as Pakistani Rupees, e.g. 185000 -> "PKR 185,000".
 * Whole rupees only; returns an empty string for non-numeric input.
 */
export function formatPKR(amount) {
  const value = Number(amount)
  if (!Number.isFinite(value)) return ''
  return `PKR ${Math.round(value).toLocaleString('en-US')}`
}

export default formatPKR
