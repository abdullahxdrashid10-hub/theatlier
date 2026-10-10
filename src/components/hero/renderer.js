import { createNoise2D } from './noise'

/**
 * Procedural Paint Canvas Renderer (Full Circular Ring with Directional Height-Field Lighting)
 *
 * Implements full clockwise circular palette-knife impasto paint composition:
 * - 14 ring strokes + 3 accent strokes forming a full ring around viewport center.
 * - Tangent clockwise flow bleeding off edges where ring exceeds viewport.
 * - Two depth layers: outer (larger, softer, ~70% opacity) and inner (smaller, sharper).
 * - Tone Rule: DOM-aware detection assigns charcoal/dark-bronze palette with subtle gold
 *   edge catch-light to strokes passing behind text (nav, H1 lockup, tagline, scroll cue).
 * - Zero rectangular cutouts or exclusion zones: paint flows behind text.
 * - Anti-aliased mask edges, high imageSmoothingQuality, wide soft tail fall-off.
 * - Idle motion: slow tangent drift (<= 2.5% viewport width over 8-12s) and breathing opacity.
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

    this.ctx.imageSmoothingEnabled = true
    this.ctx.imageSmoothingQuality = 'high'
    this.offscreenCtx.imageSmoothingEnabled = true
    this.offscreenCtx.imageSmoothingQuality = 'high'

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
   * Builds full circular ring composition:
   * - 14 ring strokes + 3 accent strokes forming a complete clockwise loop.
   * - Tangent clockwise arcs around center.
   * - Tone Rule: Strokes overlapping DOM bounding boxes of text/nav/scroll cue
   *   render in dark charcoal/bronze palette (60-75% opacity) with gold edge catch-light.
   */
  buildStrokeDefinitions() {
    const w = this.width
    const h = this.height
    const cx = w * 0.5
    const cy = h * 0.5
    const isPortrait = w / h < 1.0

    // Measure real DOM bounding boxes of text zones for Tone Rule
    const targets = [
      document.querySelector('.hero__title'),
      document.querySelector('.hero__tagline-wrapper'),
      document.querySelector('.nav__right') || document.querySelector('.nav__links') || document.querySelector('.nav'),
      document.querySelector('.hero__scroll-cue'),
    ]
    const textBoxes = []
    for (const el of targets) {
      if (el) {
        const r = el.getBoundingClientRect()
        const padX = Math.max(20 * this.dpr, r.width * 0.10)
        const padY = Math.max(20 * this.dpr, r.height * 0.10)
        textBoxes.push({
          x1: r.left * this.dpr - padX,
          y1: r.top * this.dpr - padY,
          x2: r.right * this.dpr + padX,
          y2: r.bottom * this.dpr + padY,
        })
      }
    }

    // Radii: on desktop landscape, ring fits nicely while sweeping behind text;
    // on portrait mobile, ring is larger than viewport so arcs bleed off edges.
    const rOuter = isPortrait ? Math.max(w, h) * 0.52 : h * 0.50
    const rInner = isPortrait ? Math.max(w, h) * 0.38 : h * 0.36
    const scaleFactor = (w / 1440 > 0.8 ? Math.min(w / 1440, 1.3) : Math.max(w / 768, 0.75)) * this.dpr

    const ringDefs = []

    // 1. Outer Ring (8 strokes): larger, softer, outer depth layer
    const numOuter = 8
    for (let i = 0; i < numOuter; i++) {
      const baseAngle = -Math.PI * 0.5 + i * ((Math.PI * 2) / numOuter)
      const jitter = (this.noise(i * 3.7, 1.2) - 0.5) * 0.14
      const theta = baseAngle + jitter
      const arcSpan = 0.52 + (this.noise(i * 2.1, 4.3) - 0.5) * 0.12
      const radius = rOuter * (0.94 + (this.noise(i * 1.8, 2.7) - 0.5) * 0.12)
      const wBase = (80 + ((i * 17) % 25)) * scaleFactor

      ringDefs.push({
        theta,
        arcSpan,
        radius,
        strokeW: wBase,
        isOuter: true,
        cyclePeriod: 9.0 + (i % 4) * 0.9,
        phase: (i * 1.45) % (Math.PI * 2),
      })
    }

    // 2. Inner Ring (6 strokes): smaller, sharper, foreground/midground depth layer
    const numInner = 6
    for (let i = 0; i < numInner; i++) {
      const baseAngle = -Math.PI * 0.35 + i * ((Math.PI * 2) / numInner)
      const jitter = (this.noise(i * 4.2 + 10, 3.1) - 0.5) * 0.16
      const theta = baseAngle + jitter
      const arcSpan = 0.46 + (this.noise(i * 2.5 + 8, 1.9) - 0.5) * 0.10
      const radius = rInner * (0.95 + (this.noise(i * 2.2 + 5, 6.1) - 0.5) * 0.12)
      const wBase = (55 + ((i * 19) % 22)) * scaleFactor

      ringDefs.push({
        theta,
        arcSpan,
        radius,
        strokeW: wBase,
        isOuter: false,
        cyclePeriod: 8.0 + (i % 3) * 1.1,
        phase: ((i + numOuter) * 1.35) % (Math.PI * 2),
      })
    }

    // 3. Accent Strokes (3 strokes): dynamic small swipes tucked near crests
    const accents = [
      { angle: -0.32, radius: rOuter * 1.06, arcSpan: 0.28, wBase: 44 * scaleFactor },
      { angle: 2.35, radius: rInner * 0.88, arcSpan: 0.32, wBase: 40 * scaleFactor },
      { angle: 0.45, radius: rOuter * 0.92, arcSpan: 0.30, wBase: 48 * scaleFactor },
    ]
    for (let i = 0; i < accents.length; i++) {
      const acc = accents[i]
      ringDefs.push({
        theta: acc.angle,
        arcSpan: acc.arcSpan,
        radius: acc.radius,
        strokeW: acc.wBase,
        isOuter: false,
        cyclePeriod: 10.5 + i * 0.8,
        phase: ((i + 14) * 1.5) % (Math.PI * 2),
      })
    }

    // Sort ring strokes clockwise starting from 12 o'clock (-PI/2) for natural reveal sweep
    ringDefs.sort((a, b) => {
      const normA = (a.theta + Math.PI * 0.5 + Math.PI * 4) % (Math.PI * 2)
      const normB = (b.theta + Math.PI * 0.5 + Math.PI * 4) % (Math.PI * 2)
      return normA - normB
    })

    const totalStrokes = ringDefs.length

    this.strokes = ringDefs.map((def, index) => {
      const { theta, arcSpan, radius, strokeW, isOuter, cyclePeriod, phase } = def

      // Quadratic Bezier tangent clockwise arc around center (cx, cy)
      const halfArc = arcSpan * 0.5
      const thetaStart = theta - halfArc
      const thetaEnd = theta + halfArc

      const p0 = {
        x: cx + radius * Math.cos(thetaStart),
        y: cy + radius * Math.sin(thetaStart),
      }
      const p1 = {
        x: cx + radius * Math.cos(thetaEnd),
        y: cy + radius * Math.sin(thetaEnd),
      }

      // Control point along theta angle at tangent intersection
      const rc = radius / Math.cos(halfArc)
      const pc = {
        x: cx + rc * Math.cos(theta),
        y: cy + rc * Math.sin(theta),
      }

      // Tangent vector for clockwise drift
      const tangent = {
        x: -Math.sin(theta),
        y: Math.cos(theta),
      }

      const spine = this.sampleSpine(p0, pc, p1, 8)

      // Bounding box with margin
      const margin = strokeW * 0.9
      const minX = Math.max(0, Math.floor(Math.min(p0.x, pc.x, p1.x) - margin))
      const maxX = Math.min(w, Math.ceil(Math.max(p0.x, pc.x, p1.x) + margin))
      const minY = Math.max(0, Math.floor(Math.min(p0.y, pc.y, p1.y) - margin))
      const maxY = Math.min(h, Math.ceil(Math.max(p0.y, pc.y, p1.y) + margin))

      const boxW = Math.max(10, maxX - minX)
      const boxH = Math.max(10, maxY - minY)

      // Tone Rule: Detect overlap with any text zone bounding box
      let overlapsText = false
      for (const box of textBoxes) {
        if (minX < box.x2 && maxX > box.x1 && minY < box.y2 && maxY > box.y1) {
          for (const pt of spine) {
            const clampedX = Math.max(box.x1, Math.min(box.x2, pt.x))
            const clampedY = Math.max(box.y1, Math.min(box.y2, pt.y))
            const dist = Math.hypot(pt.x - clampedX, pt.y - clampedY)
            if (dist <= strokeW * 0.75) {
              overlapsText = true
              break
            }
          }
        }
        if (overlapsText) break
      }

      const isDark = overlapsText
      const colorA = isDark ? 'charcoal' : (index % 2 === 0 ? 'gold' : 'bronzeDark')
      const colorB = isDark ? 'bronzeDark' : (index % 2 === 0 ? 'champagne' : 'gold')
      const baseOpacity = isDark
        ? (isOuter ? 0.64 : 0.72)
        : (isOuter ? 0.70 : 0.90)

      // Clockwise timeline staggered reveal
      const start = 0.04 + (index / totalStrokes) * 0.68
      const end = Math.min(0.98, start + 0.26)

      const strokeCanvas = document.createElement('canvas')
      const strokeCtx = strokeCanvas.getContext('2d')

      return {
        index,
        p0,
        pc,
        p1,
        tangent,
        strokeW,
        boxX: minX,
        boxY: minY,
        boxW,
        boxH,
        canvas: strokeCanvas,
        ctx: strokeCtx,
        isReady: false,
        spine,
        isOuter,
        isDark,
        colorA,
        colorB,
        baseOpacity,
        start,
        end,
        cyclePeriod,
        phase,
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
   * Zero rectangular cutouts: paint passes behind text.
   */
  preRenderStroke(index) {
    if (index < 0 || index >= this.strokes.length) return
    const s = this.strokes[index]
    if (s.isReady) return

    // Resolution: 1.0x in full mode, at least 0.85x in lite/reduced modes
    const baseRes = (this.lite || this.reduced) ? 0.85 : 1.0
    const maxPixels = 400000
    let gridW = Math.max(4, Math.round(s.boxW * baseRes))
    let gridH = Math.max(4, Math.round(s.boxH * baseRes))
    if (gridW * gridH > maxPixels) {
      const budgetScale = Math.sqrt(maxPixels / (gridW * gridH))
      gridW = Math.max(4, Math.round(gridW * budgetScale))
      gridH = Math.max(4, Math.round(gridH * budgetScale))
    }

    s.canvas.width = gridW
    s.canvas.height = gridH

    const spine = s.spine
    const halfW = s.strokeW * 0.5
    const maxDistSq = (halfW * 1.35) ** 2
    const totalLen = spine.totalLen

    const heightMap = new Float32Array(gridW * gridH)
    const uMap = new Float32Array(gridW * gridH)
    const vMap = new Float32Array(gridW * gridH)
    const alphaMap = new Float32Array(gridW * gridH)
    const mask = new Uint8Array(gridW * gridH)

    const invScaleX = s.boxW / gridW
    const invScaleY = s.boxH / gridH

    // Chord vectors for fast rejection
    const sDx = s.p1.x - s.p0.x
    const sDy = s.p1.y - s.p0.y
    const invSLenSq = 1 / (sDx * sDx + sDy * sDy || 1)

    // 1. Build Height Field & Anti-Aliased Alpha Mask
    for (let gy = 0; gy < gridH; gy++) {
      const worldY = s.boxY + gy * invScaleY
      const vY = worldY - s.p0.y

      for (let gx = 0; gx < gridW; gx++) {
        const worldX = s.boxX + gx * invScaleX
        const vX = worldX - s.p0.x

        // Fast chord projection reject
        const proj = (vX * sDx + vY * sDy) * invSLenSq
        if (proj < -0.15 || proj > 1.15) continue
        const perpDistSq = (vX - proj * sDx) ** 2 + (vY - proj * sDy) ** 2
        if (perpDistSq > maxDistSq * 1.8) continue

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

        if (minDistSq > maxDistSq) continue

        const sp = spine[bestIdx]
        const vx = worldX - sp.x
        const vy = worldY - sp.y
        const lateralDist = vx * sp.nx + vy * sp.ny
        const longitudinalOffset = (vx * sp.tx + vy * sp.ty) / totalLen
        const u = Math.max(0, Math.min(1, sp.t + longitudinalOffset))
        const v = lateralDist / halfW // -1 to 1

        if (u < 0 || u > 1 || Math.abs(v) > 1.0) continue

        // Anti-aliased outer mask edges (crisp, zero pixelation)
        const absV = Math.abs(v)
        const edgeDist = 1.0 - absV
        let edgeAA = edgeDist < 0.08 ? edgeDist / 0.08 : 1.0

        // Blunt flat start with gentle knife lead-in (ensures width at 5% >= 85% of width at 50%)
        if (u < 0.05) {
          edgeAA *= Math.min(1, u / 0.015)
        }

        // Wide soft alpha falloff on tail, never a straight cut
        let strokeAlpha = 1.0
        if (u > 0.45) {
          const tailT = (u - 0.45) / 0.55
          strokeAlpha = Math.max(0, 1.0 - tailT)
          const bristleNoise = this.noise(gx * 0.35 + index * 4, gy * 0.35)
          if (tailT > 0.35 && bristleNoise < tailT * 0.75) {
            strokeAlpha *= 0.6
          }
        }

        const idx = gy * gridW + gx
        mask[idx] = 1
        uMap[idx] = u
        vMap[idx] = v
        alphaMap[idx] = Math.max(0, Math.min(1, strokeAlpha * edgeAA))

        // Surface texture: silky impasto waves, knife lumps, ridges, rim
        const macroBody = 0.45 * Math.sin(u * Math.PI * 1.5 + this.noise(u * 1.8, index * 2.3) * 0.8)
        const knifeLump = 0.28 * this.noise(u * 3.5 + index * 4.2, v * 2.1)

        const glossNoise = this.noise(u * 2.2 + index * 3.1, v * 1.8)
        const glossFactor = Math.max(0, Math.min(1, (glossNoise - 0.15) * 2.2))
        const ridgeAmplitude = (1 - glossFactor * 0.85) * 0.18

        const ridgeCoord = v * 3.2 + 0.8 * this.noise(v * 4.0 + index * 2.5, u * 1.8)
        const r1 = Math.sin(ridgeCoord * Math.PI * 2.2)
        const r2 = Math.sin(ridgeCoord * Math.PI * 5.4 + this.noise(u * 5.0, index)) * 0.45
        const ridge = (r1 + r2) * ridgeAmplitude

        const rim = 0.24 * Math.exp(-Math.pow((Math.abs(v) - 0.85) / 0.18, 2))
        const crown = 0.95 - 0.22 * v * v
        const tailFade = u > 0.65 ? Math.max(0, 1 - (u - 0.65) / 0.35) : 1.0

        heightMap[idx] = Math.max(0, (crown + ridge + rim + macroBody + knifeLump) * tailFade)
      }
    }

    // 2. Directional Lighting & Specular Shading
    const lx = -0.65, ly = -0.55, lz = 0.52
    const lLen = Math.hypot(lx, ly, lz)
    const Lx = lx / lLen, Ly = ly / lLen, Lz = lz / lLen

    const vx = 0, vy = 0, vz = 1
    const Hvx = Lx + vx, Hvy = Ly + vy, Hvz = Lz + vz
    const hvLen = Math.hypot(Hvx, Hvy, Hvz)
    const hx = Hvx / hvLen, hy = Hvy / hvLen, hz = Hvz / hvLen

    const imgData = s.ctx.createImageData(gridW, gridH)
    const data = imgData.data

    for (let gy = 1; gy < gridH - 1; gy++) {
      for (let gx = 1; gx < gridW - 1; gx++) {
        const idx = gy * gridW + gx
        if (!mask[idx]) continue

        // Height gradient normal
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

        // Metallic highlight: broad soft lobe + sharp specular + glitter flecks
        const dotH = Math.max(0, Nx * hx + Ny * hy + Nz * hz)
        const broadSpec = Math.pow(dotH, 6.0) * 0.65
        const sharpSpec = Math.pow(dotH, 24.0) * 0.80
        const sparkleNoise = this.noise(gx * 0.35 + index * 6, gy * 0.35)
        const sparkle = sparkleNoise > 0.76 ? Math.pow((sparkleNoise - 0.76) / 0.24, 2) * 1.0 : 0
        const totalSpec = broadSpec + sharpSpec + sparkle

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

          const edgeGlow = (Math.abs(v) > 0.70 ? (Math.abs(v) - 0.70) * 3.3 : 0) * (0.35 + 0.65 * diff)
          const gold = this.palette.gold
          baseR += (gold.r * 0.70 - baseR) * edgeGlow
          baseG += (gold.g * 0.70 - baseG) * edgeGlow
          baseB += (gold.b * 0.70 - baseB) * edgeGlow
        } else {
          // Metallic palette: rich gold through deep bronze
          const cA = this.palette[s.colorA] || this.palette.gold
          const cB = this.palette[s.colorB] || this.palette.champagne
          const tGrad = Math.max(0, Math.min(1, 0.5 + 0.5 * v + 0.3 * (u - 0.5)))
          baseR = cA.r + (cB.r - cA.r) * tGrad
          baseG = cA.g + (cB.g - cA.g) * tGrad
          baseB = cA.b + (cB.b - cA.b) * tGrad

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

        const maxVal = Math.max(r, g, b)
        if (maxVal > 255) {
          const f = 255 / maxVal
          r *= f
          g *= f
          b *= f
        }

        const pIdx = idx * 4
        data[pIdx] = Math.round(r)
        data[pIdx + 1] = Math.round(g)
        data[pIdx + 2] = Math.round(b)
        data[pIdx + 3] = Math.round(255 * (alphaMap[idx] || 0))
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

    // Smooth interactive pointer tracking
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

    // Complete / Ambient state: slow drift along tangents + breathing opacity
    if (isAmbient || progress >= 1) {
      const maxDrift = 0.02 * this.width
      const cursorShiftX = (this.lightX - 0.5) * 8 * this.dpr
      const cursorShiftY = (this.lightY - 0.5) * 8 * this.dpr

      for (let i = 0; i < this.strokes.length; i++) {
        const s = this.strokes[i]
        if (!s.isReady) {
          this.preRenderStroke(i)
        }

        let offsetX = 0
        let offsetY = 0
        let opacity = s.baseOpacity || 0.85

        if (!this.reduced) {
          const cycle = s.cyclePeriod || 10
          const drift = Math.sin(this.ambientTime * (2 * Math.PI / cycle) + s.phase) * maxDrift
          offsetX = s.tangent.x * drift + cursorShiftX * (s.isOuter ? 0.5 : 1.0)
          offsetY = s.tangent.y * drift + cursorShiftY * (s.isOuter ? 0.5 : 1.0)
          const breath = 0.94 + 0.06 * Math.cos(this.ambientTime * (2 * Math.PI / (cycle * 0.8)) + s.phase)
          opacity *= breath
        }

        this.drawStrokeWithShadow(this.ctx, s, offsetX, offsetY, opacity)
      }

      this.drawAmbientGlow(lightParams)
      return
    }

    // Intro timeline progress: reveal strokes sequentially clockwise around the ring
    for (let i = 0; i < this.strokes.length; i++) {
      const s = this.strokes[i]
      if (progress < s.start) continue

      if (!s.isReady) {
        this.preRenderStroke(i)
      }

      if (progress >= s.end) {
        this.drawStrokeWithShadow(this.ctx, s, 0, 0, s.baseOpacity || 0.85)
      } else {
        const localP = Math.min(1, Math.max(0, (progress - s.start) / (s.end - s.start)))
        this.drawStrokeRevealed(this.ctx, s, localP)
      }
    }

    this.drawAmbientGlow(lightParams, 0.4)
  }

  drawStrokeWithShadow(targetCtx, s, offsetX = 0, offsetY = 0, opacity = 1.0) {
    targetCtx.save()
    targetCtx.globalAlpha = opacity
    targetCtx.imageSmoothingEnabled = true
    targetCtx.imageSmoothingQuality = 'high'
    targetCtx.shadowColor = 'rgba(10, 8, 6, 0.62)'
    targetCtx.shadowBlur = (this.lite || this.reduced) ? 4 * this.dpr : (s.isOuter ? 16 * this.dpr : 10 * this.dpr)
    targetCtx.shadowOffsetX = 6 * this.dpr
    targetCtx.shadowOffsetY = 8 * this.dpr
    targetCtx.drawImage(s.canvas, s.boxX + offsetX, s.boxY + offsetY, s.boxW, s.boxH)
    targetCtx.restore()
  }

  drawStrokeRevealed(targetCtx, s, localP) {
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
    targetCtx.moveTo(s.p0.x - uDx * W - nDx * W, s.p0.y - uDy * W - nDy * W)
    targetCtx.lineTo(s.p0.x - uDx * W + nDx * W, s.p0.y - uDy * W + nDy * W)
    targetCtx.lineTo(currX + nDx * W, currY + nDy * W)
    targetCtx.lineTo(currX - nDx * W, currY - nDy * W)
    targetCtx.closePath()
    targetCtx.clip()

    this.drawStrokeWithShadow(targetCtx, s, 0, 0, s.baseOpacity || 0.85)
    targetCtx.restore()
  }

  compositeAllStrokes() {
    this.offscreenCtx.clearRect(0, 0, this.width, this.height)
    for (let i = 0; i < this.strokes.length; i++) {
      const s = this.strokes[i]
      if (!s.isReady) {
        this.preRenderStroke(i)
      }
      this.drawStrokeWithShadow(this.offscreenCtx, s, 0, 0, s.baseOpacity || 0.85)
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
    const t0 = performance.now()
    const bg = this.palette.bg
    this.ctx.fillStyle = `rgb(${bg.r}, ${bg.g}, ${bg.b})`
    this.ctx.fillRect(0, 0, this.width, this.height)
    for (let i = 0; i < this.strokes.length; i++) {
      const s = this.strokes[i]
      if (!s.isReady) {
        this.preRenderStroke(i)
      }
      this.drawStrokeWithShadow(this.ctx, s, 0, 0, s.baseOpacity || 0.85)
    }
    this.drawAmbientGlow({ lx: 0.6, ly: 0.5 }, 0.8)
    if (typeof window !== 'undefined') {
      window.__heroReducedMotionCostMs = performance.now() - t0
    }
  }
}
