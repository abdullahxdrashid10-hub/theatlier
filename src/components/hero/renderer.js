import { createRng, createNoise2D } from './noise'

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
    this.dpr = Math.min(window.devicePixelRatio || 1, this.lite ? 1.25 : 1.5)

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

    // Normalized coordinates [sx, sy, cx, cy, ex, ey, w, colorA, colorB, start, end]
    // 3:1 to 4:1 length to width ratio, flat blunt start, slight curvature
    const rawStrokes = isPortrait
      ? [
          // Mobile Portrait - Upper-Right Cluster (above H1 exclusion zone)
          { sx: 0.51, sy: 0.25, cx: 0.60, cy: 0.16, ex: 0.72, ey: 0.06, w: 68, colorA: 'shadow', colorB: 'bronze', start: 0.05, end: 0.38 },
          { sx: 0.47, sy: 0.23, cx: 0.57, cy: 0.13, ex: 0.69, ey: 0.04, w: 80, colorA: 'bronze', colorB: 'gold', start: 0.12, end: 0.46 },
          { sx: 0.55, sy: 0.24, cx: 0.65, cy: 0.15, ex: 0.77, ey: 0.07, w: 72, colorA: 'taupe', colorB: 'champagne', start: 0.20, end: 0.55 },
          { sx: 0.50, sy: 0.19, cx: 0.58, cy: 0.11, ex: 0.68, ey: 0.03, w: 64, colorA: 'gold', colorB: 'champagne', start: 0.28, end: 0.64 },

          // Mobile Portrait - Lower-Left Cluster (below Tagline exclusion zone)
          { sx: 0.49, sy: 0.75, cx: 0.39, cy: 0.84, ex: 0.27, ey: 0.95, w: 68, colorA: 'shadow', colorB: 'bronze', start: 0.38, end: 0.72 },
          { sx: 0.45, sy: 0.76, cx: 0.35, cy: 0.86, ex: 0.22, ey: 0.96, w: 80, colorA: 'bronze', colorB: 'gold', start: 0.46, end: 0.82 },
          { sx: 0.53, sy: 0.77, cx: 0.43, cy: 0.87, ex: 0.31, ey: 0.98, w: 72, colorA: 'taupe', colorB: 'champagne', start: 0.54, end: 0.90 },
          { sx: 0.42, sy: 0.77, cx: 0.33, cy: 0.85, ex: 0.24, ey: 0.94, w: 64, colorA: 'gold', colorB: 'champagne', start: 0.62, end: 0.98 },
        ]
      : [
          // Desktop Landscape - Upper-Right Cluster (rising up-right directly above "LIER")
          { sx: 0.53, sy: 0.21, cx: 0.60, cy: 0.12, ex: 0.69, ey: 0.03, w: 90, colorA: 'shadow', colorB: 'bronze', start: 0.05, end: 0.38 },
          { sx: 0.49, sy: 0.20, cx: 0.57, cy: 0.10, ex: 0.66, ey: 0.02, w: 105, colorA: 'bronze', colorB: 'gold', start: 0.12, end: 0.46 },
          { sx: 0.56, sy: 0.21, cx: 0.64, cy: 0.13, ex: 0.74, ey: 0.04, w: 95, colorA: 'taupe', colorB: 'champagne', start: 0.20, end: 0.55 },
          { sx: 0.51, sy: 0.17, cx: 0.58, cy: 0.09, ex: 0.67, ey: 0.02, w: 80, colorA: 'gold', colorB: 'champagne', start: 0.28, end: 0.64 },

          // Desktop Landscape - Lower-Left Cluster (fanning down-left directly below "ATEL" and tagline)
          { sx: 0.48, sy: 0.77, cx: 0.39, cy: 0.86, ex: 0.29, ey: 0.96, w: 90, colorA: 'shadow', colorB: 'bronze', start: 0.38, end: 0.72 },
          { sx: 0.44, sy: 0.78, cx: 0.35, cy: 0.87, ex: 0.24, ey: 0.97, w: 105, colorA: 'bronze', colorB: 'gold', start: 0.46, end: 0.82 },
          { sx: 0.51, sy: 0.79, cx: 0.43, cy: 0.88, ex: 0.33, ey: 0.98, w: 95, colorA: 'taupe', colorB: 'champagne', start: 0.54, end: 0.90 },
          { sx: 0.41, sy: 0.78, cx: 0.33, cy: 0.86, ex: 0.23, ey: 0.94, w: 80, colorA: 'gold', colorB: 'champagne', start: 0.62, end: 0.98 },
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
    const h1El = document.querySelector('.hero__title')
    const tagEl = document.querySelector('.hero__tagline-wrapper')
    const padX = (this.width / this.dpr) * 0.04 * this.dpr
    const padY = (this.height / this.dpr) * 0.04 * this.dpr

    const exclusions = []
    if (h1El) {
      const r = h1El.getBoundingClientRect()
      exclusions.push({
        x1: Math.floor(r.left * this.dpr - padX),
        y1: Math.floor(r.top * this.dpr - padY),
        x2: Math.ceil(r.right * this.dpr + padX),
        y2: Math.ceil(r.bottom * this.dpr + padY),
      })
    }
    if (tagEl) {
      const r = tagEl.getBoundingClientRect()
      exclusions.push({
        x1: Math.floor(r.left * this.dpr - padX),
        y1: Math.floor(r.top * this.dpr - padY),
        x2: Math.ceil(r.right * this.dpr + padX),
        y2: Math.ceil(r.bottom * this.dpr + padY),
      })
    }
    return exclusions
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
        if (typeof window.requestIdleCallback === 'function') {
          window.requestIdleCallback(() => scheduleNext(), { timeout: 30 })
        } else {
          this.preRenderTimeout = setTimeout(scheduleNext, 0)
        }
      }
    }

    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(() => scheduleNext(), { timeout: 30 })
    } else {
      this.preRenderTimeout = setTimeout(scheduleNext, 0)
    }
  }

  /**
   * Pre-renders a single stroke into its dedicated offscreen canvas
   * using the Height Field + Directional Lighting pipeline.
   */
  preRenderStroke(index) {
    if (index < 0 || index >= this.strokes.length) return
    const s = this.strokes[index]
    if (s.isReady) return

    // In lite mode, use half/third-resolution height field for massive speedup
    const resScale = this.lite ? 0.35 : 1.0
    const gridW = Math.max(4, Math.round(s.boxW * resScale))
    const gridH = Math.max(4, Math.round(s.boxH * resScale))

    s.canvas.width = gridW
    s.canvas.height = gridH

    const exclusions = this.getTextExclusions()
    const spine = s.spine
    const halfW = s.strokeW * 0.5
    const totalLen = spine.totalLen

    const heightMap = new Float32Array(gridW * gridH)
    const uMap = new Float32Array(gridW * gridH)
    const mask = new Uint8Array(gridW * gridH)

    const invScale = 1 / resScale

    // 1. Build Height Field
    for (let gy = 0; gy < gridH; gy++) {
      const worldY = s.boxY + gy * invScale
      for (let gx = 0; gx < gridW; gx++) {
        const worldX = s.boxX + gx * invScale

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

        // Fast spine projection
        let minDistSq = Infinity
        let bestIdx = 0
        for (let i = 0; i < spine.length; i++) {
          const dSq = (worldX - spine[i].x) ** 2 + (worldY - spine[i].y) ** 2
          if (dSq < minDistSq) {
            minDistSq = dSq
            bestIdx = i
          }
        }

        // Bounding reject if too far from spine
        if (minDistSq > (halfW * 1.35) ** 2) continue

        const sp = spine[bestIdx]
        const vx = worldX - sp.x
        const vy = worldY - sp.y
        const lateralDist = vx * sp.nx + vy * sp.ny
        const longitudinalOffset = (vx * sp.tx + vy * sp.ty) / totalLen
        const u = Math.max(0, Math.min(1, sp.t + longitudinalOffset))
        const v = lateralDist / halfW // -1 to 1

        if (u < 0 || u > 1 || Math.abs(v) > 1.05) continue

        // Flat blunt start with slightly rounded corners (Check #3 compliance)
        const cornerR = 0.045
        if (u < cornerR && Math.abs(v) > 1 - cornerR) {
          const cu = cornerR - u
          const cv = Math.abs(v) - (1 - cornerR)
          if (cu * cu + cv * cv > cornerR * cornerR) continue
        }

        // Dry-brush tail breakup (ridges terminate at varying lengths)
        if (u > 0.70) {
          const tailEnd = 0.72 + 0.28 * (0.5 + 0.5 * Math.sin(v * 16) * this.noise(v * 6 + index, 1.5))
          if (u > tailEnd) continue
        }

        const idx = gy * gridW + gx
        mask[idx] = 1
        uMap[idx] = u

        // Organic palette knife impasto height:
        const wobble = 0.05 * this.noise(u * 2.5 + index * 5, v * 3.0)
        const vw = v + wobble

        // Parallel knife blade tracks with sharp ridge crests and flat scrape bevels
        const s1 = Math.sin(vw * Math.PI * 6.0 + 0.4)
        const s2 = Math.sin(vw * Math.PI * 13.0 + 1.2)
        const s3 = Math.cos(vw * Math.PI * 21.0 + 0.7)

        const ridge =
          0.48 * Math.sign(s1) * Math.pow(Math.abs(s1), 0.75) +
          0.26 * Math.sign(s2) * Math.pow(Math.abs(s2), 0.85) +
          0.14 * s3

        // Raised rim where palette knife blade edges squeeze thick paint
        const rim = 0.40 * Math.exp(-Math.pow((Math.abs(v) - 0.88) / 0.14, 2))
        // Low-frequency impasto volume and knife chatter
        const paintBody = 0.32 * this.noise(u * 2.8 + index * 7, v * 1.8)
        // Crown across width
        const crown = 1.05 - 0.25 * v * v
        // Smooth tail ramp-down
        const tailFade = u > 0.68 ? Math.max(0, 1 - (u - 0.68) / 0.30) : 1.0

        heightMap[idx] = Math.max(0, (crown + ridge + rim + paintBody) * tailFade)
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

    const colorA = this.palette[s.colorA] || this.palette.gold
    const colorB = this.palette[s.colorB] || this.palette.champagne
    const shadowColor = this.palette.shadow

    const imgData = s.ctx.createImageData(gridW, gridH)
    const data = imgData.data

    for (let gy = 1; gy < gridH - 1; gy++) {
      for (let gx = 1; gx < gridW - 1; gx++) {
        const idx = gy * gridW + gx
        if (!mask[idx]) continue

        // Height gradient normal
        const dh_dx = (heightMap[idx + 1] - heightMap[idx - 1]) * 0.5
        const dh_dy = (heightMap[idx + gridW] - heightMap[idx - gridW]) * 0.5
        const scaleH = 2.5
        const nx = -dh_dx * scaleH
        const ny = -dh_dy * scaleH
        const nz = 1.0
        const nLen = Math.hypot(nx, ny, nz)
        const Nx = nx / nLen, Ny = ny / nLen, Nz = nz / nLen

        // Diffuse
        const diff = Math.max(0, Nx * Lx + Ny * Ly + Nz * Lz)

        // Specular
        const dotH = Nx * hx + Ny * hy + Nz * hz
        const spec = Math.pow(Math.max(0, dotH), 22.0)

        // Metallic sparkle flecks
        const sparkleNoise = this.noise(gx * 0.2 + index * 5, gy * 0.2)
        const sparkle = sparkleNoise > 0.78 ? (sparkleNoise - 0.78) * 3.5 * spec : 0

        // Base color interpolation along u
        const u = uMap[idx]
        const baseR = (1 - u) * colorA.r + u * colorB.r
        const baseG = (1 - u) * colorA.g + u * colorB.g
        const baseB = (1 - u) * colorA.b + u * colorB.b

        let r, g, b
        if (diff < 0.45) {
          // Shadow tint toward burnt umber #3A2A1C
          const sf = (0.45 - diff) / 0.45
          r = (1 - sf) * baseR + sf * shadowColor.r
          g = (1 - sf) * baseG + sf * shadowColor.g
          b = (1 - sf) * baseB + sf * shadowColor.b
        } else {
          // Highlight: golden champagne boost preserving warm hue
          const lf = (diff - 0.45) / 0.55
          const boost = spec * 42 + sparkle * 75
          r = baseR * (0.85 + lf * 0.2) + boost * 1.0
          g = baseG * (0.85 + lf * 0.2) + boost * 0.73
          b = baseB * (0.85 + lf * 0.2) + boost * 0.35
        }

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
        data[pIdx + 3] = 255
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

    this.drawAmbientGlow(lightParams, 0.4)
  }

  drawStrokeWithShadow(targetCtx, s) {
    targetCtx.save()
    targetCtx.shadowColor = 'rgba(10, 8, 6, 0.62)'
    targetCtx.shadowBlur = 12 * this.dpr
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
    this.drawAmbientGlow({ lx: 0.6, ly: 0.5 }, 0.8)
  }
}
