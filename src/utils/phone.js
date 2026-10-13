/**
 * Pakistani mobile helpers.
 * Accepts +92 3xx xxxxxxx, 0092 3xx..., 92 3xx..., or 03xx xxxxxxx.
 * Normalised form: +923XXXXXXXXX
 */
export function normalisePKPhone(input) {
  const stripped = String(input || '').replace(/[\s\-().]/g, '')
  if (!stripped) return null

  let national = null
  if (stripped.startsWith('+92')) national = stripped.slice(3)
  else if (stripped.startsWith('0092')) national = stripped.slice(4)
  else if (stripped.startsWith('92')) national = stripped.slice(2)
  else if (stripped.startsWith('0')) national = stripped.slice(1)

  if (national === null || !/^3\d{9}$/.test(national)) return null
  return `+92${national}`
}

/** Friendly display, e.g. +92 300 1234567 */
export function formatPKPhone(normalised) {
  if (!normalised) return ''
  return `${normalised.slice(0, 3)} ${normalised.slice(3, 6)} ${normalised.slice(6)}`
}
