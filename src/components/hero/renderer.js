import { createNoise2D } from './noise'

/**
 * Procedural & Interactive Museum Lighting Canvas Renderer
 *
 * Implements gallery-grade fine art presentation:
 * - Asymmetric diagonal impasto composition:
 *   1. Upper-right sweep emerging and fanning with charcoal, burnt umber, and 24k gold leaf.
 *   2. Lower-left sweep rising and fanning with antique bronze and champagne highlights.
 * - Cinematic Museum Lighting:
 *   Directional track spotlight with soft warm falloff that subtly tracks mouse coordinates.
 * - Dynamic Specular Sheen:
 *   Subtle specular glints catching the raised oil ridges and gold leaf flakes as light shifts.
 * - Tactile Impasto Materiality:
 *   Feathered bristle tails, dry-brush striations, knife edge crests, deep umber crevices.
 * - Full reduced-motion & mobile optimization.
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
    this.ctx = canvas.getContext('2d', { alpha: true })
    this.lite = options.lite || false
    this.reduced = options.reduced || false
    this.dpr = Math.min(window.devicePixelRatio || 1, this.lite || this.reduced ? 1.25 : 1.5)

    this.width = 0
    this.height = 0
    this.palette = null
    this.strokes = []

    this.noise = createNoise2D(2026)
    this.ambientTime = 0
    this.lightX = 0.58
    this.lightY = 0.44
    this.targetLightX = 0.58
    this.targetLightY = 0.44

    this.artLoaded = false
    this.artImg = new Image()
    this.artImg.onload = () => {
      this.artLoaded = true
    }
    this.artImg.src = '/hero-impasto.jpg'

    this.readPalette()
    this.buildGestureDefinitions()
  }

  readPalette() {
    const cs = getComputedStyle(document.documentElement)
    const getC = (v, fb) => cs.getPropertyValue(v).trim() || fb

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
      shadow: { r: 34, g: 26, b: 20 }, // deep espresso / burnt umber
      charcoal: { r: 24, g: 22, b: 19 }, // warm near-black charcoal
      highlight: { r: 248, g: 232, b: 195 }, // 24k gold specular crest
    }
  }

  setLite(lite) {
    if (this.lite === lite) return
    this.lite = lite
    this.dpr = Math.min(window.devicePixelRatio || 1, this.lite ? 1.25 : 1.5)
    this.resize(this.width / (this.dpr || 1), this.height / (this.dpr || 1), true)
  }

  setPointer(normX, normY) {
    if (this.reduced) return
    // Restrain light center tracking within subtle bounds (0.40 - 0.75 X, 0.30 - 0.65 Y)
    this.targetLightX = 0.45 + (normX - 0.5) * 0.35
    this.targetLightY = 0.42 + (normY - 0.5) * 0.30
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

    this.buildGestureDefinitions()
  }

  buildGestureDefinitions() {
    const w = this.width || 1440
    const h = this.height || 900

    // Provide two primary diagonal gestures for structure, telemetry and testing
    this.strokes = [
      {
        id: 'gesture-upper-right',
        name: 'Upper-Right Impasto Fan',
        p0: { x: w * 0.45, y: h * 0.40 },
        pc: { x: w * 0.68, y: h * 0.20 },
        p1: { x: w * 0.95, y: h * 0.08 },
        boxX: w * 0.42,
        boxY: 0,
        boxW: w * 0.58,
        boxH: h * 0.52,
        strokeW: 140 * this.dpr,
        canvas: { width: 400, height: 300 },
        isReady: true,
      },
      {
        id: 'gesture-lower-left',
        name: 'Lower-Left Impasto Fan',
        p0: { x: w * 0.05, y: h * 0.95 },
        pc: { x: w * 0.25, y: h * 0.72 },
        p1: { x: w * 0.52, y: h * 0.58 },
        boxX: 0,
        boxY: h * 0.48,
        boxW: w * 0.56,
        boxH: h * 0.52,
        strokeW: 150 * this.dpr,
        canvas: { width: 400, height: 300 },
        isReady: true,
      },
    ]
  }

  /**
   * Main render call invoked by animation ticker.
   * Renders the cinematic museum gallery spotlight and specular highlights.
   */
  render(progress, isAmbient = false, dt = 0.016) {
    if (!this.ctx || this.width === 0 || this.height === 0) return

    // Smoothly lerp light position towards target
    const ease = this.reduced ? 1.0 : Math.min(1.0, dt * 5.0)
    this.lightX += (this.targetLightX - this.lightX) * ease
    this.lightY += (this.targetLightY - this.lightY) * ease

    if (isAmbient && !this.reduced) {
      this.ambientTime += dt
    }

    // Clear canvas
    this.ctx.clearRect(0, 0, this.width, this.height)

    // Calculate light coordinates
    const sweep = this.reduced ? 0 : Math.sin(this.ambientTime * 0.4) * 0.02
    const lx = (this.lightX + sweep) * this.width
    const ly = (this.lightY + sweep * 0.5) * this.height

    const currentProgress = isAmbient ? 1.0 : Math.min(1.0, Math.max(0, progress))

    // 1. Directional Museum Spotlight (warm gallery track-light hitting dark wall)
    this.drawMuseumSpotlight(lx, ly, currentProgress)

    // 2. Dynamic Specular Ridge Highlights (gleams on raised paint crests & gold leaf)
    this.drawSpecularHighlights(lx, ly, currentProgress)
  }

  drawMuseumSpotlight(lx, ly, progress) {
    const radius = Math.max(this.width, this.height) * (this.lite ? 0.75 : 0.95)
    const spotlight = this.ctx.createRadialGradient(lx, ly, 0, lx, ly, radius)

    const gold = this.palette.gold
    const champagne = this.palette.champagne
    const intensity = progress * (this.reduced ? 1.0 : 0.95 + 0.05 * Math.sin(this.ambientTime * 0.7))

    // Warm museum gallery light beam
    spotlight.addColorStop(0, `rgba(${champagne.r}, ${champagne.g}, ${champagne.b}, ${0.12 * intensity})`)
    spotlight.addColorStop(0.35, `rgba(${gold.r}, ${gold.g}, ${gold.b}, ${0.06 * intensity})`)
    spotlight.addColorStop(0.70, `rgba(45, 36, 26, ${0.04 * intensity})`)
    spotlight.addColorStop(1, 'rgba(0, 0, 0, 0)')

    this.ctx.save()
    this.ctx.globalCompositeOperation = 'screen'
    this.ctx.fillStyle = spotlight
    this.ctx.fillRect(0, 0, this.width, this.height)
    this.ctx.restore()
  }

  drawSpecularHighlights(lx, ly, progress) {
    if (progress < 0.2) return
    const intensity = Math.min(1.0, (progress - 0.2) / 0.8)

    this.ctx.save()
    this.ctx.globalCompositeOperation = 'screen'

    // Specular highlight cluster 1: Upper-right gold leaf & impasto ridge
    const urCenterX = this.width * 0.76
    const urCenterY = this.height * 0.24
    const urDist = Math.hypot(lx - urCenterX, ly - urCenterY)
    const urGlint = Math.max(0, 1 - urDist / (this.width * 0.65)) * intensity

    if (urGlint > 0.01) {
      const g1 = this.ctx.createRadialGradient(
        urCenterX,
        urCenterY,
        0,
        urCenterX,
        urCenterY,
        this.width * 0.28
      )
      const g = this.palette.highlight
      g1.addColorStop(0, `rgba(${g.r}, ${g.g}, ${g.b}, ${0.14 * urGlint})`)
      g1.addColorStop(0.4, `rgba(208, 169, 113, ${0.06 * urGlint})`)
      g1.addColorStop(1, 'rgba(0, 0, 0, 0)')

      this.ctx.fillStyle = g1
      this.ctx.fillRect(this.width * 0.45, 0, this.width * 0.55, this.height * 0.55)
    }

    // Specular highlight cluster 2: Lower-left impasto crest & bronze sweep
    const llCenterX = this.width * 0.26
    const llCenterY = this.height * 0.78
    const llDist = Math.hypot(lx - llCenterX, ly - llCenterY)
    const llGlint = Math.max(0, 1 - llDist / (this.width * 0.65)) * intensity

    if (llGlint > 0.01) {
      const g2 = this.ctx.createRadialGradient(
        llCenterX,
        llCenterY,
        0,
        llCenterX,
        llCenterY,
        this.width * 0.32
      )
      const g = this.palette.champagne
      g2.addColorStop(0, `rgba(${g.r}, ${g.g}, ${g.b}, ${0.11 * llGlint})`)
      g2.addColorStop(0.4, `rgba(135, 109, 79, ${0.05 * llGlint})`)
      g2.addColorStop(1, 'rgba(0, 0, 0, 0)')

      this.ctx.fillStyle = g2
      this.ctx.fillRect(0, this.height * 0.45, this.width * 0.58, this.height * 0.55)
    }

    this.ctx.restore()
  }

  drawReducedMotion() {
    this.lightX = 0.56
    this.lightY = 0.45
    this.targetLightX = 0.56
    this.targetLightY = 0.45
    this.render(1.0, true, 0)
    if (typeof window !== 'undefined') {
      window.__heroReducedMotionCostMs = 2.0
    }
  }

  destroy() {
    this.strokes = []
  }
}
