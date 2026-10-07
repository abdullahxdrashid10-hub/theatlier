import { createRng, createNoise2D } from './noise'

/**
 * Procedural Paint Canvas Renderer (2D Impasto)
 *
 * Implements thick metallic paint strokes matching the logo reference:
 * - High density bristle sub-strokes with dry-brush edges
 * - Top-edge specular ridge highlight and darker bottom undercuts
 * - Offscreen canvas caching for completed strokes
 * - Dynamic light sweep & mouse/touch interactive light
 * - Full mode vs Lite mode (60% fewer bristles, reduced DPR)
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

    this.lastRenderedProgress = -1
    this.cachedUpToStroke = -1

    this.readPalette()
  }

  readPalette() {
    const cs = getComputedStyle(document.documentElement)
    const getC = (v, fb) => (cs.getPropertyValue(v).trim() || fb)

    const bgHex = getC('--bg', '#151410')
    const surfaceHex = getC('--surface', '#1E1C17')
    const lineHex = getC('--line', '#4B3D2C')
    const goldHex = getC('--gold', '#D0A971')
    const champagneHex = getC('--champagne', '#E4C48F')
    const taupeHex = getC('--taupe', '#B4A187')
    const bronzeHex = getC('--bronze', '#876D4F')

    const bgRgb = hexToRgb(bgHex)
    const lineRgb = hexToRgb(lineHex)
    // Derived charcoal tone: mix bg and line
    const charcoalRgb = {
      r: Math.round((bgRgb.r + lineRgb.r) / 2),
      g: Math.round((bgRgb.g + lineRgb.g) / 2),
      b: Math.round((bgRgb.b + lineRgb.b) / 2),
    }

    this.palette = {
      bg: bgRgb,
      surface: hexToRgb(surfaceHex),
      gold: hexToRgb(goldHex),
      champagne: hexToRgb(champagneHex),
      taupe: hexToRgb(taupeHex),
      bronze: hexToRgb(bronzeHex),
      charcoal: charcoalRgb,
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

    this.dpr = dpr
    this.width = pW
    this.height = pH

    this.canvas.width = pW
    this.canvas.height = pH
    this.offscreenCanvas.width = pW
    this.offscreenCanvas.height = pH

    this.buildStrokeDefinitions()
    this.resetCache()
  }

  resetCache() {
    this.offscreenCtx.clearRect(0, 0, this.width, this.height)
    this.cachedUpToStroke = -1
    this.lastRenderedProgress = -1
  }

  buildStrokeDefinitions() {
    const w = this.width
    const h = this.height

    // 12 strokes matching the logo composition:
    // diagonal sweeps gathering from top-middle towards bottom-center/right,
    // leaving center-left relatively open for the wordmark.
    const rawStrokes = [
      // Top cluster (gold & champagne crowns)
      { sx: 0.52, sy: 0.10, cx: 0.58, cy: 0.25, ex: 0.65, ey: 0.42, w: 90, color: 'gold', start: 0.05, end: 0.48 },
      { sx: 0.46, sy: 0.15, cx: 0.52, cy: 0.30, ex: 0.60, ey: 0.50, w: 105, color: 'champagne', start: 0.10, end: 0.52 },
      { sx: 0.56, sy: 0.12, cx: 0.64, cy: 0.28, ex: 0.72, ey: 0.48, w: 85, color: 'bronze', start: 0.16, end: 0.58 },

      // Mid right metallic wedge
      { sx: 0.50, sy: 0.24, cx: 0.60, cy: 0.38, ex: 0.70, ey: 0.58, w: 120, color: 'taupe', start: 0.22, end: 0.64 },
      { sx: 0.40, sy: 0.22, cx: 0.48, cy: 0.36, ex: 0.58, ey: 0.54, w: 95, color: 'charcoal', start: 0.28, end: 0.70 },
      { sx: 0.58, sy: 0.26, cx: 0.68, cy: 0.44, ex: 0.76, ey: 0.66, w: 110, color: 'gold', start: 0.34, end: 0.76 },

      // Lower sweep cluster (under wordmark, fanning down)
      { sx: 0.45, sy: 0.48, cx: 0.36, cy: 0.62, ex: 0.30, ey: 0.82, w: 115, color: 'charcoal', start: 0.40, end: 0.82 },
      { sx: 0.48, sy: 0.50, cx: 0.42, cy: 0.66, ex: 0.36, ey: 0.88, w: 100, color: 'bronze', start: 0.46, end: 0.88 },
      { sx: 0.52, sy: 0.52, cx: 0.46, cy: 0.68, ex: 0.42, ey: 0.92, w: 120, color: 'gold', start: 0.52, end: 0.94 },
      { sx: 0.54, sy: 0.55, cx: 0.50, cy: 0.72, ex: 0.48, ey: 0.94, w: 110, color: 'champagne', start: 0.58, end: 0.98 },
      { sx: 0.58, sy: 0.54, cx: 0.56, cy: 0.72, ex: 0.54, ey: 0.95, w: 95, color: 'taupe', start: 0.64, end: 1.00 },
      { sx: 0.62, sy: 0.52, cx: 0.62, cy: 0.70, ex: 0.60, ey: 0.92, w: 80, color: 'bronze', start: 0.70, end: 1.00 },
    ]

    const baseBristleCount = this.lite ? 24 : 60

    this.strokes = rawStrokes.map((s, strokeIdx) => {
      const strokeWidth = s.w * this.dpr * (w / 1440 > 0.8 ? Math.min(w / 1440, 1.3) : Math.max(w / 768, 0.75))
      const bristles = []
      const strokeRng = createRng(strokeIdx * 199 + 42)

      for (let b = 0; b < baseBristleCount; b++) {
        const offsetNorm = (b / (baseBristleCount - 1)) * 2 - 1 // -1 to 1 across width
        const widthVary = 0.5 + strokeRng() * 1.0
        const alphaVary = 0.35 + strokeRng() * 0.55
        const lengthOffset = (strokeRng() - 0.5) * 0.15 // ragged start/end
        const noiseFreq = 0.008 + strokeRng() * 0.012

        bristles.push({
          offsetNorm,
          widthVary,
          alphaVary,
          lengthOffset,
          noiseFreq,
        })
      }

      return {
        ...s,
        strokeWidth,
        bristles,
        sx: s.sx * w,
        sy: s.sy * h,
        cx: s.cx * w,
        cy: s.cy * h,
        ex: s.ex * w,
        ey: s.ey * h,
      }
    })
  }

  /**
   * Evaluates quadratic bezier and its normal vector
   */
  evaluateCurve(s, t) {
    const it = 1 - t
    const x = it * it * s.sx + 2 * it * t * s.cx + t * t * s.ex
    const y = it * it * s.sy + 2 * it * t * s.cy + t * t * s.ey

    // Tangent dx, dy
    const dx = 2 * it * (s.cx - s.sx) + 2 * t * (s.ex - s.cx)
    const dy = 2 * it * (s.cy - s.sy) + 2 * t * (s.ey - s.cy)
    const len = Math.hypot(dx, dy) || 1

    // Normal (perpendicular)
    const nx = -dy / len
    const ny = dx / len

    return { x, y, nx, ny }
  }

  /**
   * Draws a single stroke onto targetCtx up to localProgress (0 to 1)
   */
  renderStroke(targetCtx, s, localProgress, lightParams) {
    if (localProgress <= 0) return

    const colorRgb = this.palette[s.color] || this.palette.gold
    const numPoints = Math.max(10, Math.floor(localProgress * 70))
    const halfWidth = s.strokeWidth * 0.5

    // Light highlights
    const { lx, ly } = lightParams

    for (let bi = 0; bi < s.bristles.length; bi++) {
      const b = s.bristles[bi]
      const actualProg = Math.max(0, Math.min(1, (localProgress - b.lengthOffset) / (1 - Math.abs(b.lengthOffset) * 0.5)))
      if (actualProg <= 0.05) continue

      const steps = Math.max(4, Math.floor(actualProg * numPoints))
      targetCtx.beginPath()

      let started = false
      for (let step = 0; step <= steps; step++) {
        const t = (step / steps) * actualProg
        const pt = this.evaluateCurve(s, t)

        // Bristle offset with noise taper
        const noiseOffset = this.noise(pt.x * b.noiseFreq, pt.y * b.noiseFreq) * (halfWidth * 0.18)
        const taper = Math.sin(t * Math.PI) // tapered ends
        const perpDist = b.offsetNorm * halfWidth * taper + noiseOffset

        const px = pt.x + pt.nx * perpDist
        const py = pt.y + pt.ny * perpDist

        if (!started) {
          targetCtx.moveTo(px, py)
          started = true
        } else {
          targetCtx.lineTo(px, py)
        }
      }

      // Specular highlight on upper ridge, shadow undercut on lower
      const ridgeHighlight = b.offsetNorm < -0.2 ? 0.35 : (b.offsetNorm > 0.4 ? -0.25 : 0.0)
      
      // Dynamic lighting distance factor
      const mid = this.evaluateCurve(s, actualProg * 0.5)
      const distToLight = Math.hypot(mid.x / this.width - lx, mid.y / this.height - ly)
      const lightBoost = Math.max(0, 1 - distToLight * 1.5) * 0.4

      const r = Math.min(255, Math.max(0, Math.round(colorRgb.r + (ridgeHighlight + lightBoost) * 120)))
      const g = Math.min(255, Math.max(0, Math.round(colorRgb.g + (ridgeHighlight + lightBoost) * 105)))
      const bColor = Math.min(255, Math.max(0, Math.round(colorRgb.b + (ridgeHighlight + lightBoost) * 85)))
      const alpha = Math.min(0.9, Math.max(0.15, b.alphaVary * (0.6 + lightBoost * 0.4)))

      targetCtx.strokeStyle = `rgba(${r}, ${g}, ${bColor}, ${alpha})`
      targetCtx.lineWidth = Math.max(1, (s.strokeWidth / s.bristles.length) * b.widthVary * 1.8)
      targetCtx.lineCap = 'round'
      targetCtx.stroke()
    }
  }

  /**
   * Main render call
   * @param {number} progress Global animation progress (0 to 1 during intro; 1 during ambient)
   * @param {boolean} isAmbient Whether intro is complete
   * @param {number} dt Delta time in seconds
   */
  render(progress, isAmbient = false, dt = 0.016) {
    if (!this.palette || this.width === 0) return

    // Smooth light coordinates
    const lerpFactor = this.lite ? 0.08 : 0.05
    this.lightX += (this.targetLightX - this.lightX) * lerpFactor
    this.lightY += (this.targetLightY - this.lightY) * lerpFactor

    // Ambient light sweep oscillation
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

    if (isAmbient || progress >= 1) {
      // All strokes complete: use offscreen cache if already drawn
      if (this.cachedUpToStroke < this.strokes.length - 1) {
        this.offscreenCtx.clearRect(0, 0, this.width, this.height)
        for (let i = 0; i < this.strokes.length; i++) {
          this.renderStroke(this.offscreenCtx, this.strokes[i], 1.0, lightParams)
        }
        this.cachedUpToStroke = this.strokes.length - 1
      }
      this.ctx.drawImage(this.offscreenCanvas, 0, 0)
      this.drawAmbientGlow(lightParams)
      return
    }

    // Intro timeline progress
    // Draw cached finished strokes
    let currentDrawingStrokeIndex = -1
    for (let i = 0; i < this.strokes.length; i++) {
      const s = this.strokes[i]
      if (progress >= s.end) {
        if (i > this.cachedUpToStroke) {
          this.renderStroke(this.offscreenCtx, s, 1.0, lightParams)
          this.cachedUpToStroke = i
        }
      } else if (progress >= s.start) {
        currentDrawingStrokeIndex = i
        break
      }
    }

    // Draw cached strokes from offscreen
    this.ctx.drawImage(this.offscreenCanvas, 0, 0)

    // Draw active progressing strokes
    for (let i = Math.max(0, this.cachedUpToStroke + 1); i < this.strokes.length; i++) {
      const s = this.strokes[i]
      if (progress < s.start) continue
      const localP = Math.min(1, Math.max(0, (progress - s.start) / (s.end - s.start)))
      // Simple cubic ease-out
      const easedP = 1 - Math.pow(1 - localP, 3)
      this.renderStroke(this.ctx, s, easedP, lightParams)
    }

    if (currentDrawingStrokeIndex !== -1) {
      this.drawAmbientGlow(lightParams, 0.4)
    }
  }

  drawAmbientGlow(lightParams, intensity = 1.0) {
    const { lx, ly } = lightParams
    const radX = lx * this.width
    const radY = ly * this.height
    const radius = Math.max(this.width, this.height) * (this.lite ? 0.45 : 0.6)

    const grad = this.ctx.createRadialGradient(radX, radY, 0, radX, radY, radius)
    const gold = this.palette.gold
    const a1 = (this.lite ? 0.08 : 0.12) * intensity
    const a2 = (this.lite ? 0.03 : 0.05) * intensity

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
    const lightParams = { lx: 0.6, ly: 0.5 }
    this.offscreenCtx.clearRect(0, 0, this.width, this.height)
    for (let i = 0; i < this.strokes.length; i++) {
      this.renderStroke(this.offscreenCtx, this.strokes[i], 1.0, lightParams)
    }
    const bg = this.palette.bg
    this.ctx.fillStyle = `rgb(${bg.r}, ${bg.g}, ${bg.b})`
    this.ctx.fillRect(0, 0, this.width, this.height)
    this.ctx.drawImage(this.offscreenCanvas, 0, 0)
    this.drawAmbientGlow(lightParams, 0.8)
  }
}
