/**
 * Seeded PRNG & Simplex-style 2D value noise for procedural paint impasto strokes.
 */

// LCG PRNG
export function createRng(seed = 1337) {
  let s = (seed >>> 0) || 1
  return function next() {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

// 2D Smooth Value Noise
export function createNoise2D(seed = 42) {
  const rng = createRng(seed)
  const perm = new Uint8Array(512)
  const p = new Uint8Array(256)
  for (let i = 0; i < 256; i++) p[i] = i
  for (let i = 255; i > 0; i--) {
    const r = Math.floor(rng() * (i + 1))
    const t = p[i]
    p[i] = p[r]
    p[r] = t
  }
  for (let i = 0; i < 512; i++) {
    perm[i] = p[i & 255]
  }

  function fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10)
  }

  function lerp(t, a, b) {
    return a + t * (b - a)
  }

  function grad(hash, x, y) {
    const h = hash & 3
    const u = h === 1 || h === 2 ? -x : x
    const v = h === 2 || h === 3 ? -y : y
    return u + v
  }

  return function noise2D(x, y) {
    const X = Math.floor(x) & 255
    const Y = Math.floor(y) & 255
    const xf = x - Math.floor(x)
    const yf = y - Math.floor(y)

    const u = fade(xf)
    const v = fade(yf)

    const a = perm[X] + Y
    const aa = perm[a]
    const ab = perm[a + 1]
    const b = perm[X + 1] + Y
    const ba = perm[b]
    const bb = perm[b + 1]

    const g1 = grad(perm[aa], xf, yf)
    const g2 = grad(perm[ba], xf - 1, yf)
    const g3 = grad(perm[ab], xf, yf - 1)
    const g4 = grad(perm[bb], xf - 1, yf - 1)

    return lerp(v, lerp(u, g1, g2), lerp(u, g3, g4))
  }
}
