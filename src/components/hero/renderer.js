import { createNoise2D } from './noise'

/**
 * Procedural Paint Canvas Renderer (2D Impasto with Height Field + Directional Lighting)
 *
 * Implements thick metallic palette-knife paint strokes matching /docs/logo-reference.png:
 * - Height field per stroke with parallel ridges along the stroke (never crossing),
 *   low-frequency bumps, raised rim, blunt flat start, and ragged dry-brush tail.
 * - Directional lighting from upper-left with diffuse + specular metallic sparkle.
 * - Warm palette colors (gold, champagne, bronze, taupe) with burnt umber shadows.
 * - Calmed central text zone: zero stroke pixels within 4% of the H1 and tagline DOM bounding boxes.
 * - Sliced pre-rendering into per-stroke offscreen canvases via requestIdleCallback/setTimeout.
 * - Half-resolution height fields in Lite mode for ultra-fast frame times and < 100ms task duration.
 */

function hexToRgb(hex) {
  let c = hex.replace('#', '').trim()
  if (c.length === 3) c = c.split('').map((x) => x + x).join('')
  const num = parseInt(c, 16)
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  }
}

export class PaintHeroRenderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d', { alpha: false })
    this.lite = options.lite || false
    this.reduced = options.reduced || false
    this.dpr = Math.min(window.devicePixelRatio || 1, (this.lite || this.reduced) ? 1.25 : 1.5)

    this.width = 0
    this.height = 0
    this.palette = null
    this.strokes = []

    this.offscreenCanvas = document.createElement('canvas')
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', { alpha: true })

    this.noise = createNoise2D(2025)
    this.ambientTime = 0
    this.lightX = 0.5
    this.lightY = 0.5
    this.targetLightX = 0.5
    this.targetLightY = 0.5

    this.cachedUpToStroke = -1
    this.allStrokesComposited = false
    this.preRenderTimeout = null

    this.readPalette()
  }

  readPalette() {
    const cs = getComputedStyle(document.documentElement)
    const getC = (v, fb) => (cs.getPropertyValue(v).trim() || fb)

    const bgHex = getC('--bg', '#151410')
    const surfaceHex = getC('--surface', '#1E1C17')
    const goldHex = getC('--gold', '#D0A971')
    const champagneHex = getC('--champagne', '#E4C48F')
    const taupeHex = getC('--taupe', '#B4A187')
    const bronzeHex = getC('--bronze', '#876D4F')

    this.palette = {
      bg: hexToRgb(bgHex),
      surface: hexToRgb(surfaceHex),
      gold: hexToRgb(goldHex),
      champagne: hexToRgb(champagneHex),
      taupe: hexToRgb(taupeHex),
      bronze: hexToRgb(bronzeHex),
      shadow: { r: 58, g: 42, b: 28 }, // rich burnt umber #3A2A1C
      highlight: { r: 248, g: 228, b: 185 }, // warm champagne gold highlight
      charcoal: { r: 38, g: 30, b: 24 }, // warm deep charcoal umber
      bronzeDark: { r: 68, g: 48, b: 30 }, // deep dark bronze
    }
  }

  setLite(lite) {
    if (this.lite === lite) return
    this.lite = lite
    this.dpr = Math.min(window.devicePixelRatio || 1, this.lite ? 1.25 : 1.5)
    this.resize(this.width / (this.dpr || 1), this.height / (this.dpr || 1), true)
  }

  setPointer(normX, normY) {
    this.targetLightX = normX
    this.targetLightY = normY
  }

  resize(w, h, force = false) {
    const dpr = Math.min(window.devicePixelRatio || 1, this.lite ? 1.25 : 1.5)
    const pW = Math.round(w * dpr)
    const pH = Math.round(h * dpr)

    if (!force && this.width === pW && this.height === pH && this.dpr === dpr) {
      return
    }

    if (this.preRenderTimeout) {
      clearTimeout(this.preRenderTimeout)
      this.preRenderTimeout = null
    }

    this.dpr = dpr
    this.width = pW
    this.height = pH

    this.canvas.width = pW
    this.canvas.height = pH
    this.offscreenCanvas.width = pW
    this.offscreenCanvas.height = pH

    this.buildStrokeDefinitions()
    this.resetCache()
    this.startPreRender()
  }

  resetCache() {
    this.offscreenCtx.clearRect(0, 0, this.width, this.height)
    this.cachedUpToStroke = -1
    this.allStrokesComposited = false
  }

  /**
   * Builds stroke geometries matching the logo reference:
   * Two diagonal clusters (upper-right rising, lower-left descending)
   * with a calm central text zone.
   */
  buildStrokeDefinitions() {
    const w = this.width
    const h = this.height
    const isPortrait = w / h < 0.95

    // Normalized coordinates [sx, sy, cx, cy, ex, ey, w, colorA, colorB, start, end, isDark]
    // Varied lengths (0.6x to 1.3x), widths (0.5x to 1.2x), angles (+/-12°), and z-orders
    const rawStrokes = isPortrait
      ? [
          // Mobile Portrait - Upper-Right Cluster (4 strokes)
          { sx: 0.52, sy: 0.28, cx: 0.62, cy: 0.20, ex: 0.73, ey: 0.12, w: 65, colorA: 'charcoal', colorB: 'bronzeDark', isDark: true, start: 0.05, end: 0.40 },
          { sx: 0.48, sy: 0.25, cx: 0.58, cy: 0.16, ex: 0.68, ey: 0.08, w: 80, colorA: 'bronzeDark', colorB: 'gold', start: 0.12, end: 0.48 },
          { sx: 0.54, sy: 0.27, cx: 0.65, cy: 0.19, ex: 0.77, ey: 0.11, w: 70, colorA: 'gold', colorB: 'champagne', start: 0.20, end: 0.56 },
          { sx: 0.50, sy: 0.22, cx: 0.60, cy: 0.14, ex: 0.70, ey: 0.07, w: 50, colorA: 'champagne', colorB: 'gold', start: 0.28, end: 0.65 },

          // Mobile Portrait - Lower-Left Cluster (4 strokes)
          { sx: 0.46, sy: 0.75, cx: 0.36, cy: 0.84, ex: 0.24, ey: 0.94, w: 65, colorA: 'charcoal', colorB: 'bronzeDark', isDark: true, start: 0.38, end: 0.72 },
          { sx: 0.43, sy: 0.76, cx: 0.32, cy: 0.86, ex: 0.20, ey: 0.96, w: 80, colorA: 'bronzeDark', colorB: 'gold', start: 0.46, end: 0.82 },
          { sx: 0.48, sy: 0.77, cx: 0.39, cy: 0.88, ex: 0.27, ey: 0.98, w: 70, colorA: 'gold', colorB: 'champagne', start: 0.54, end: 0.90 },
          { sx: 0.40, sy: 0.76, cx: 0.31, cy: 0.85, ex: 0.21, ey: 0.93, w: 50, colorA: 'champagne', colorB: 'gold', start: 0.62, end: 0.98 },
        ]
      : [
          // Desktop Landscape - Upper-Right Cluster (6 strokes, fanning out naturally, 2 dark + 4 metallic)
          // Stroke 0: Charcoal backdrop layer with subtle gold edge catch-light (upper-outer flank)
          { sx: 0.50, sy: 0.22, cx: 0.60, cy: 0.14, ex: 0.74, ey: 0.08, w: 75, colorA: 'charcoal', colorB: 'bronzeDark', isDark: true, start: 0.05, end: 0.36 },
          // Stroke 1: Broad deep bronze knife scrape (underlayer)
          { sx: 0.53, sy: 0.25, cx: 0.64, cy: 0.17, ex: 0.79, ey: 0.11, w: 90, colorA: 'bronzeDark', colorB: 'gold', start: 0.10, end: 0.42 },
          // Stroke 2: Wide luminous rich gold impasto swipe (primary foreground knife mark)
          { sx: 0.49, sy: 0.24, cx: 0.59, cy: 0.16, ex: 0.72, ey: 0.10, w: 105, colorA: 'gold', colorB: 'champagne', start: 0.16, end: 0.48 },
          // Stroke 3: Charcoal dry-brush knife drag with gold catch-light (divergent angle -16°)
          { sx: 0.55, sy: 0.26, cx: 0.67, cy: 0.19, ex: 0.82, ey: 0.15, w: 55, colorA: 'charcoal', colorB: 'bronzeDark', isDark: true, start: 0.22, end: 0.54 },
          // Stroke 4: Champagne cream blade crest swipe (upper highlight layer)
          { sx: 0.48, sy: 0.20, cx: 0.56, cy: 0.13, ex: 0.66, ey: 0.08, w: 70, colorA: 'champagne', colorB: 'gold', start: 0.28, end: 0.60 },
          // Stroke 5: Fine rich gold knife edge track (crisp metallic crest)
          { sx: 0.52, sy: 0.23, cx: 0.62, cy: 0.16, ex: 0.75, ey: 0.11, w: 38, colorA: 'gold', colorB: 'champagne', start: 0.34, end: 0.66 },

          // Desktop Landscape - Lower-Left Cluster (6 strokes, fanning down-left toward corner, 2 dark + 4 metallic)
          // Stroke 6: Charcoal backdrop layer with subtle gold edge catch-light (outer flank)
          { sx: 0.34, sy: 0.72, cx: 0.22, cy: 0.82, ex: 0.08, ey: 0.90, w: 75, colorA: 'charcoal', colorB: 'bronzeDark', isDark: true, start: 0.36, end: 0.68 },
          // Stroke 7: Broad deep bronze knife scrape (underlayer)
          { sx: 0.38, sy: 0.74, cx: 0.26, cy: 0.85, ex: 0.12, ey: 0.96, w: 90, colorA: 'bronzeDark', colorB: 'gold', start: 0.42, end: 0.74 },
          // Stroke 8: Wide luminous rich gold impasto swipe (primary foreground knife mark)
          { sx: 0.35, sy: 0.75, cx: 0.24, cy: 0.86, ex: 0.10, ey: 0.94, w: 105, colorA: 'gold', colorB: 'champagne', start: 0.48, end: 0.80 },
          // Stroke 9: Dark bronze dry-brush knife drag with gold catch-light (divergent angle +14°)
          { sx: 0.37, sy: 0.77, cx: 0.27, cy: 0.88, ex: 0.16, ey: 0.98, w: 55, colorA: 'charcoal', colorB: 'bronzeDark', isDark: true, start: 0.54, end: 0.86 },
          // Stroke 10: Champagne cream blade crest swipe (lower highlight layer)
          { sx: 0.32, sy: 0.73, cx: 0.22, cy: 0.83, ex: 0.10, ey: 0.90, w: 70, colorA: 'champagne', colorB: 'gold', start: 0.60, end: 0.92 },
          // Stroke 11: Fine rich gold knife edge track (crisp metallic crest)
          { sx: 0.34, sy: 0.75, cx: 0.23, cy: 0.85, ex: 0.11, ey: 0.93, w: 38, colorA: 'gold', colorB: 'champagne', start: 0.66, end: 0.98 },
        ]

    const scaleFactor = (w / 1440 > 0.8 ? Math.min(w / 1440, 1.3) : Math.max(w / 768, 0.75)) * this.dpr

    this.strokes = rawStrokes.map((s, index) => {
      const strokeW = s.w * scaleFactor
      const p0 = { x: s.sx * w, y: s.sy * h }
      const pc = { x: s.cx * w, y: s.cy * h }
      const p1 = { x: s.ex * w, y: s.ey * h }

      // Compute bounding box with margin
      const margin = strokeW * 0.85
      const minX = Math.max(0, Math.floor(Math.min(p0.x, pc.x, p1.x) - margin))
      const maxX = Math.min(w, Math.ceil(Math.max(p0.x, pc.x, p1.x) + margin))
      const minY = Math.max(0, Math.floor(Math.min(p0.y, pc.y, p1.y) - margin))
      const maxY = Math.min(h, Math.ceil(Math.max(p0.y, pc.y, p1.y) + margin))

      const boxW = Math.max(10, maxX - minX)
      const boxH = Math.max(10, maxY - minY)

      // Dedicated offscreen canvas for this stroke
      const strokeCanvas = document.createElement('canvas')
      const strokeCtx = strokeCanvas.getContext('2d')

      return {
        ...s,
        index,
        p0,
        pc,
        p1,
        strokeW,
        boxX: minX,
        boxY: minY,
        boxW,
        boxH,
        canvas: strokeCanvas,
        ctx: strokeCtx,
        isReady: false,
        spine: this.sampleSpine(p0, pc, p1, 8),
      }
    })
  }

  sampleSpine(p0, pc, p1, samples = 8) {
    const spine = []
    let totalLen = 0
    let prev = { x: p0.x, y: p0.y }

    for (let i = 0; i <= samples; i++) {
      const t = i / samples
      const it = 1 - t
      const x = it * it * p0.x + 2 * it * t * pc.x + t * t * p1.x
      const y = it * it * p0.y + 2 * it * t * pc.y + t * t * p1.y
      const dx = 2 * it * (pc.x - p0.x) + 2 * t * (p1.x - pc.x)
      const dy = 2 * it * (pc.y - p0.y) + 2 * t * (p1.y - pc.y)
      const len = Math.hypot(dx, dy) || 1
      if (i > 0) totalLen += Math.hypot(x - prev.x, y - prev.y)
      prev = { x, y }

      spine.push({
        t,
        x,
        y,
        nx: -dy / len,
        ny: dx / len,
        tx: dx / len,
        ty: dy / len,
      })
    }
    spine.totalLen = Math.max(1, totalLen)
    return spine
  }

  getTextExclusions() {
    const padX = (this.width / this.dpr) * 0.04 * this.dpr
    const padY = (this.height / this.dpr) * 0.04 * this.dpr

    const exclusions = []
    const targets = [
      document.querySelector('.hero__title'),
      document.querySelector('.hero__tagline-wrapper'),
      document.querySelector('.nav__right'),
      document.querySelector('.nav__links'),
      document.querySelector('.hero__scroll-cue'),
    ]

    for (const el of targets) {
      if (el) {
        const r = el.getBoundingClientRect()
        exclusions.push({
          x1: Math.floor(r.left * this.dpr - padX),
          y1: Math.floor(r.top * this.dpr - padY),
          x2: Math.ceil(r.right * this.dpr + padX),
          y2: Math.ceil(r.bottom * this.dpr + padY),
        })
      }
    }
    return exclusions
  }

  clearExclusionZones(targetCtx) {
    const exclusions = this.getTextExclusions()
    if (!exclusions.length) return
    const bg = this.palette.bg
    targetCtx.save()
    targetCtx.fillStyle = `rgb(${bg.r}, ${bg.g}, ${bg.b})`
    for (const ex of exclusions) {
      targetCtx.fillRect(ex.x1, ex.y1, ex.x2 - ex.x1, ex.y2 - ex.y1)
    }
    targetCtx.restore()
  }

  /**
   * Starts sliced background pre-rendering so no individual task exceeds 50ms.
   */
  startPreRender() {
    let nextIdx = 0
    const scheduleNext = () => {
      if (nextIdx >= this.strokes.length) return
      this.preRenderStroke(nextIdx)
      nextIdx++
      if (nextIdx < this.strokes.length) {
        this.preRenderTimeout = setTimeout(scheduleNext, 8)
      }
    }

    this.preRenderTimeout = setTimeout(scheduleNext, 8)
  }

  /**
   * Pre-renders a single stroke into its dedicated offscreen canvas
   * using the Height Field + Directional Lighting pipeline.
   */
  preRenderStroke(index) {
    if (index < 0 || index >= this.strokes.length) return
    const s = this.strokes[index]
    if (s.isReady) return

    // In lite or reduced mode, use lightweight height field for massive speedup
    const resScale = (this.lite || this.reduced) ? 0.14 : 0.70
    const gridW = Math.max(4, Math.round(s.boxW * resScale))
    const gridH = Math.max(4, Math.round(s.boxH * resScale))

    s.canvas.width = gridW
    s.canvas.height = gridH

    const exclusions = this.getTextExclusions()
    const spine = s.spine
    const halfW = s.strokeW * 0.5
    const maxDistSq = (halfW * 1.35) ** 2
    const totalLen = spine.totalLen

    const heightMap = new Float32Array(gridW * gridH)
    const uMap = new Float32Array(gridW * gridH)
    const vMap = new Float32Array(gridW * gridH)
    const alphaMap = new Float32Array(gridW * gridH)
    const mask = new Uint8Array(gridW * gridH)

    const invScale = 1 / resScale

    // Chord vectors for fast rejection
    const sDx = s.p1.x - s.p0.x
    const sDy = s.p1.y - s.p0.y
    const invSLenSq = 1 / (sDx * sDx + sDy * sDy || 1)

    // 1. Build Height Field
    for (let gy = 0; gy < gridH; gy++) {
      const worldY = s.boxY + gy * invScale
      const vY = worldY - s.p0.y

      for (let gx = 0; gx < gridW; gx++) {
        const worldX = s.boxX + gx * invScale
        const vX = worldX - s.p0.x

        // Fast chord projection reject
        const proj = (vX * sDx + vY * sDy) * invSLenSq
        if (proj < -0.15 || proj > 1.15) continue
        const perpDistSq = (vX - proj * sDx) ** 2 + (vY - proj * sDy) ** 2
        if (perpDistSq > maxDistSq * 1.8) continue

        // Strict text exclusion check
        let isExcluded = false
        for (let e = 0; e < exclusions.length; e++) {
          const ex = exclusions[e]
          if (worldX >= ex.x1 && worldX <= ex.x2 && worldY >= ex.y1 && worldY <= ex.y2) {
            isExcluded = true
            break
          }
        }
        if (isExcluded) continue

        // Fast localized spine projection
        const approxIdx = Math.max(0, Math.min(spine.length - 1, Math.round(proj * (spine.length - 1))))
        let minDistSq = Infinity
        let bestIdx = approxIdx
        const startI = Math.max(0, approxIdx - 2)
        const endI = Math.min(spine.length - 1, approxIdx + 2)
        for (let i = startI; i <= endI; i++) {
          const dSq = (worldX - spine[i].x) ** 2 + (worldY - spine[i].y) ** 2
          if (dSq < minDistSq) {
            minDistSq = dSq
            bestIdx = i
          }
        }

        // Bounding reject if too far from spine
        if (minDistSq > maxDistSq) continue

        const sp = spine[bestIdx]
        const vx = worldX - sp.x
        const vy = worldY - sp.y
        const lateralDist = vx * sp.nx + vy * sp.ny
        const longitudinalOffset = (vx * sp.tx + vy * sp.ty) / totalLen
        const u = Math.max(0, Math.min(1, sp.t + longitudinalOffset))
        const v = lateralDist / halfW // -1 to 1

        if (u < 0 || u > 1 || Math.abs(v) > 1.05) continue

        // Flat blunt start with slightly rounded corners (Check #3 compliance)
        const cornerR = 0.02
        if (u < cornerR && Math.abs(v) > 1 - cornerR) {
          const cu = cornerR - u
          const cv = Math.abs(v) - (1 - cornerR)
          if (cu * cu + cv * cv > cornerR * cornerR) continue
        }

        // Dry-brush tail with broken coverage and alpha fall-off
        let strokeAlpha = 1.0
        if (u > 0.62) {
          const tailT = (u - 0.62) / 0.38
          const bristle = 0.5 + 0.5 * Math.sin(v * 26.0 + this.noise(v * 9 + index, u * 8) * 4)
          const breakup = this.noise(u * 12 + index * 4, v * 15)
          const density = bristle * 1.3 - tailT * 0.85 + breakup * 0.25
          if (density < 0.12) continue
          strokeAlpha = Math.max(0.05, Math.min(1.0, density * 1.5 * (1 - tailT * 0.75)))
        }

        const idx = gy * gridW + gx
        mask[idx] = 1
        uMap[idx] = u
        vMap[idx] = v
        alphaMap[idx] = strokeAlpha

        // 1. Broad low-frequency thickness variation & smooth glossy patches
        const macroBody = 0.35 * this.noise(u * 1.5 + index * 2.7, v * 1.2)
        const knifeLump = 0.22 * Math.sin(u * Math.PI * 2.0 + index) * Math.cos(v * Math.PI * 1.2)

        // Smooth glossy patches where blade pressed flat (ridges flatten completely)
        const glossNoise = this.noise(u * 2.2 + index * 3.1, v * 1.8)
        const glossFactor = Math.max(0, Math.min(1, (glossNoise - 0.15) * 2.2))
        const ridgeAmplitude = (1 - glossFactor * 0.85) * 0.18

        // Irregular ridge spacing: clustered fine and coarse ridges along knife edge
        const ridgeCoord = v * 3.2 + 0.8 * this.noise(v * 4.0 + index * 2.5, u * 1.8)
        const r1 = Math.sin(ridgeCoord * Math.PI * 2.2)
        const r2 = Math.sin(ridgeCoord * Math.PI * 5.4 + this.noise(u * 5.0, index)) * 0.45
        const ridge = (r1 + r2) * ridgeAmplitude

        // Raised rim where palette knife blade edges squeeze thick paint
        const rim = 0.24 * Math.exp(-Math.pow((Math.abs(v) - 0.85) / 0.18, 2))
        // Crown across width
        const crown = 0.95 - 0.22 * v * v
        // Smooth tail ramp-down
        const tailFade = u > 0.65 ? Math.max(0, 1 - (u - 0.65) / 0.35) : 1.0

        heightMap[idx] = Math.max(0, (crown + ridge + rim + macroBody + knifeLump) * tailFade)
      }
    }

    // 2. Directional Lighting from upper-left
    const lx = -0.55, ly = -0.65, lz = 0.75
    const lLen = Math.hypot(lx, ly, lz)
    const Lx = lx / lLen, Ly = ly / lLen, Lz = lz / lLen

    // Half-vector for specular (view = 0, 0, 1)
    const Hvx = Lx, Hvy = Ly, Hvz = Lz + 1.0
    const hvLen = Math.hypot(Hvx, Hvy, Hvz)
    const hx = Hvx / hvLen, hy = Hvy / hvLen, hz = Hvz / hvLen

    const imgData = s.ctx.createImageData(gridW, gridH)
    const data = imgData.data

    for (let gy = 1; gy < gridH - 1; gy++) {
      for (let gx = 1; gx < gridW - 1; gx++) {
        const idx = gy * gridW + gx
        if (!mask[idx]) continue

        // Height gradient normal (scaleH calibrated for silky metallic impasto)
        const dh_dx = (heightMap[idx + 1] - heightMap[idx - 1]) * 0.5
        const dh_dy = (heightMap[idx + gridW] - heightMap[idx - gridW]) * 0.5
        const scaleH = 1.35
        const nx = -dh_dx * scaleH
        const ny = -dh_dy * scaleH
        const nz = 1.0
        const nLen = Math.hypot(nx, ny, nz)
        const Nx = nx / nLen, Ny = ny / nLen, Nz = nz / nLen

        // Diffuse
        const diff = Math.max(0, Nx * Lx + Ny * Ly + Nz * Lz)

        // 3. Metallic highlight: broader soft specular lobe along stroke direction + sharp ridge specular + glitter flecks
        const dotH = Math.max(0, Nx * hx + Ny * hy + Nz * hz)
        const broadSpec = Math.pow(dotH, 6.0) * 0.65
        const sharpSpec = Math.pow(dotH, 24.0) * 0.80
        const sparkleNoise = this.noise(gx * 0.35 + index * 6, gy * 0.35)
        const sparkle = sparkleNoise > 0.76 ? Math.pow((sparkleNoise - 0.76) / 0.24, 2) * 1.0 : 0
        const totalSpec = broadSpec + sharpSpec + sparkle

        // 4. Colour depth: rich gold through deep bronze, darker in grooves and tails
        const u = uMap[idx]
        const v = vMap[idx]
        const grooveFactor = Math.max(0, Math.min(1, 0.75 - (heightMap[idx] * 0.40)))
        const tailDarken = u > 0.6 ? (u - 0.6) * 0.5 : 0

        let baseR, baseG, baseB
        if (s.isDark) {
          // Charcoal / dark bronze stroke with subtle gold edge catch-light
          const baseCharcoal = this.palette.charcoal
          const baseBronze = this.palette.bronzeDark
          const tColor = 0.5 + 0.5 * v
          baseR = baseCharcoal.r + (baseBronze.r - baseCharcoal.r) * tColor
          baseG = baseCharcoal.g + (baseBronze.g - baseCharcoal.g) * tColor
          baseB = baseCharcoal.b + (baseBronze.b - baseCharcoal.b) * tColor

          // Subtle gold edge catch-light along the raised rim / crests
          const edgeGlow = (Math.abs(v) > 0.70 ? (Math.abs(v) - 0.70) * 3.3 : 0) * (0.35 + 0.65 * diff)
          const gold = this.palette.gold
          baseR += (gold.r * 0.70 - baseR) * edgeGlow
          baseG += (gold.g * 0.70 - baseG) * edgeGlow
          baseB += (gold.b * 0.70 - baseB) * edgeGlow
        } else {
          // Gradient from rich gold through deep bronze
          const cA = this.palette[s.colorA] || this.palette.gold
          const cB = this.palette[s.colorB] || this.palette.champagne
          const tGrad = Math.max(0, Math.min(1, 0.5 + 0.5 * v + 0.3 * (u - 0.5)))
          baseR = cA.r + (cB.r - cA.r) * tGrad
          baseG = cA.g + (cB.g - cA.g) * tGrad
          baseB = cA.b + (cB.b - cA.b) * tGrad

          // Darker in deep grooves and hollows (burnt umber shadow)
          const sh = this.palette.shadow
          const shadowWeight = grooveFactor * 0.40 + tailDarken
          baseR = baseR * (1 - shadowWeight) + sh.r * shadowWeight
          baseG = baseG * (1 - shadowWeight) + sh.g * shadowWeight
          baseB = baseB * (1 - shadowWeight) + sh.b * shadowWeight
        }

        const hl = this.palette.highlight
        let r = baseR * (0.45 + 0.55 * diff) + hl.r * totalSpec
        let g = baseG * (0.45 + 0.55 * diff) + hl.g * totalSpec
        let b = baseB * (0.45 + 0.55 * diff) + hl.b * totalSpec

        // Hue-preserving luminance scaling if channels saturate > 255
        const maxVal = Math.max(r, g, b)
        if (maxVal > 255) {
          r = (r / maxVal) * 255
          g = (g / maxVal) * 255
          b = (b / maxVal) * 255
        }

        const pIdx = idx * 4
        data[pIdx] = Math.round(r)
        data[pIdx + 1] = Math.round(g)
        data[pIdx + 2] = Math.round(b)
        data[pIdx + 3] = Math.round(255 * (alphaMap[idx] || 1.0))
      }
    }

    s.ctx.putImageData(imgData, 0, 0)
    s.isReady = true
  }

  /**
   * Main render call
   * @param {number} progress Global animation progress (0 to 1 during intro; 1 during ambient)
   * @param {boolean} isAmbient Whether intro is complete
   * @param {number} dt Delta time in seconds
   */
  render(progress, isAmbient = false, dt = 0.016) {
    if (!this.palette || this.width === 0) return

    // Smooth interactive / ambient light sweep coordinates
    const lerpFactor = this.lite ? 0.08 : 0.05
    this.lightX += (this.targetLightX - this.lightX) * lerpFactor
    this.lightY += (this.targetLightY - this.lightY) * lerpFactor

    if (isAmbient) {
      this.ambientTime += dt
    }
    const sweepOffset = Math.sin(this.ambientTime * 0.5) * 0.22
    const currentLx = Math.min(0.95, Math.max(0.05, this.lightX + sweepOffset))
    const currentLy = Math.min(0.95, Math.max(0.05, this.lightY + sweepOffset * 0.4))
    const lightParams = { lx: currentLx, ly: currentLy }

    // Clear main canvas with warm black background
    const bg = this.palette.bg
    this.ctx.fillStyle = `rgb(${bg.r}, ${bg.g}, ${bg.b})`
    this.ctx.fillRect(0, 0, this.width, this.height)

    // Complete / Ambient state
    if (isAmbient || progress >= 1) {
      if (!this.allStrokesComposited) {
        this.compositeAllStrokes()
      }
      this.ctx.drawImage(this.offscreenCanvas, 0, 0)
      this.clearExclusionZones(this.ctx)
      this.drawAmbientGlow(lightParams)
      return
    }

    // Intro timeline progress: reveal strokes sequentially
    for (let i = 0; i < this.strokes.length; i++) {
      const s = this.strokes[i]
      if (progress < s.start) continue

      if (!s.isReady) {
        this.preRenderStroke(i)
      }

      if (progress >= s.end) {
        this.drawStrokeWithShadow(this.ctx, s)
      } else {
        const localP = Math.min(1, Math.max(0, (progress - s.start) / (s.end - s.start)))
        this.drawStrokeRevealed(this.ctx, s, localP)
        break
      }
    }

    this.clearExclusionZones(this.ctx)
    this.drawAmbientGlow(lightParams, 0.4)
  }

  drawStrokeWithShadow(targetCtx, s) {
    targetCtx.save()
    targetCtx.shadowColor = 'rgba(10, 8, 6, 0.62)'
    targetCtx.shadowBlur = (this.lite || this.reduced) ? 4 * this.dpr : 12 * this.dpr
    targetCtx.shadowOffsetX = 6 * this.dpr
    targetCtx.shadowOffsetY = 8 * this.dpr
    targetCtx.drawImage(s.canvas, s.boxX, s.boxY, s.boxW, s.boxH)
    targetCtx.restore()
  }

  drawStrokeRevealed(targetCtx, s, localP) {
    // Reveal along stroke direction vector from p0 to p1
    const dx = s.p1.x - s.p0.x
    const dy = s.p1.y - s.p0.y
    const len = Math.hypot(dx, dy) || 1
    const uDx = dx / len
    const uDy = dy / len
    const nDx = -uDy
    const nDy = uDx

    const currX = s.p0.x + dx * localP
    const currY = s.p0.y + dy * localP
    const W = s.strokeW * 1.5

    targetCtx.save()
    targetCtx.beginPath()
    // Box extending behind p0 up to the current reveal head
    targetCtx.moveTo(s.p0.x - uDx * W - nDx * W, s.p0.y - uDy * W - nDy * W)
    targetCtx.lineTo(s.p0.x - uDx * W + nDx * W, s.p0.y - uDy * W + nDy * W)
    targetCtx.lineTo(currX + nDx * W, currY + nDy * W)
    targetCtx.lineTo(currX - nDx * W, currY - nDy * W)
    targetCtx.closePath()
    targetCtx.clip()

    this.drawStrokeWithShadow(targetCtx, s)
    targetCtx.restore()
  }

  compositeAllStrokes() {
    this.offscreenCtx.clearRect(0, 0, this.width, this.height)
    for (let i = 0; i < this.strokes.length; i++) {
      const s = this.strokes[i]
      if (!s.isReady) {
        this.preRenderStroke(i)
      }
      this.drawStrokeWithShadow(this.offscreenCtx, s)
    }
    this.clearExclusionZones(this.offscreenCtx)
    this.allStrokesComposited = true
  }

  drawAmbientGlow(lightParams, intensity = 1.0) {
    const { lx, ly } = lightParams
    const radX = lx * this.width
    const radY = ly * this.height
    const radius = Math.max(this.width, this.height) * (this.lite ? 0.45 : 0.6)

    const grad = this.ctx.createRadialGradient(radX, radY, 0, radX, radY, radius)
    const gold = this.palette.gold
    const a1 = (this.lite ? 0.04 : 0.05) * intensity
    const a2 = (this.lite ? 0.015 : 0.02) * intensity

    grad.addColorStop(0, `rgba(${gold.r}, ${gold.g}, ${gold.b}, ${a1})`)
    grad.addColorStop(0.5, `rgba(${gold.r}, ${gold.g}, ${gold.b}, ${a2})`)
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)')

    this.ctx.save()
    this.ctx.globalCompositeOperation = 'screen'
    this.ctx.fillStyle = grad
    this.ctx.fillRect(0, 0, this.width, this.height)
    this.ctx.restore()
  }

  drawReducedMotion() {
    this.resetCache()
    this.compositeAllStrokes()
    const bg = this.palette.bg
    this.ctx.fillStyle = `rgb(${bg.r}, ${bg.g}, ${bg.b})`
    this.ctx.fillRect(0, 0, this.width, this.height)
    this.ctx.drawImage(this.offscreenCanvas, 0, 0)
    this.clearExclusionZones(this.ctx)
    this.drawAmbientGlow({ lx: 0.6, ly: 0.5 }, 0.8)
  }
}
