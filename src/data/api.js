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
