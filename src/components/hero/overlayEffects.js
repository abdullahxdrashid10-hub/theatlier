import { heroEffects } from '../../config/heroEffects'

/**
 * Interactive Overlay Manager for Dust (pigment trail) & Loupe (magnifying lens)
 *
 * Requirements:
 * - Fine-pointer devices only.
 * - DUST: particles emitted from pointer velocity, max 120 alive, champagne to gold,
 *   additive blend, fading out over ~1.2s. Never over headline or button.
 * - LOUPE: circular lens 170px grows in (200ms) after pointer rests for 700ms, magnifying
 *   image 1.6x, with thin brass ring and 4 crosshair ticks. Fades out if speed > 600px/s.
 *   Never shown over headline, button, nav, or [data-no-loupe].
 */

export class OverlayEffectsManager {
  constructor(canvas, container, options = {}) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.container = container
    this.options = options

    this.isFinePointer = typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.5)

    // Image for Loupe 1.6x magnification
    this.artImg = new Image()
    this.artImg.src = '/hero-impasto.jpg'

    // Dust particles array
    this.particles = []
    this.maxParticles = 120

    // Pointer velocity & tracking
    this.lastX = -1000
    this.lastY = -1000
    this.currentX = -1000
    this.currentY = -1000
    this.speed = 0
    this.lastTime = performance.now()

    // Loupe state
    this.loupeRestTime = 0
    this.loupeProgress = 0 // 0 to 1
    this.loupeActive = false
    this.loupeRadius = 85 // 170px diameter / 2
    this.magnification = 1.6

    // Excluded zones
    this.noLoupeBoxes = []

    this.updateNoLoupeBoxes()
  }

  updateNoLoupeBoxes() {
    if (typeof document === 'undefined') return
    const elements = document.querySelectorAll(
      '.hero__title, .hero__cta-wrapper, .nav, [data-no-loupe]'
    )
    const boxes = []
    const cRect = this.container.getBoundingClientRect()
    elements.forEach((el) => {
      const r = el.getBoundingClientRect()
      boxes.push({
        x1: r.left - cRect.left - 10,
        y1: r.top - cRect.top - 10,
        x2: r.right - cRect.left + 10,
        y2: r.bottom - cRect.top + 10,
      })
    })
    this.noLoupeBoxes = boxes
  }

  isOverRestrictedZone(x, y) {
    for (let i = 0; i < this.noLoupeBoxes.length; i++) {
      const b = this.noLoupeBoxes[i]
      if (x >= b.x1 && x <= b.x2 && y >= b.y1 && y <= b.y2) {
        return true
      }
    }
    return false
  }

  resize(w, h) {
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    this.canvas.width = Math.round(w * this.dpr)
    this.canvas.height = Math.round(h * this.dpr)
    this.updateNoLoupeBoxes()
  }

  onPointerMove(clientX, clientY) {
    if (!this.isFinePointer) return

    const cRect = this.container.getBoundingClientRect()
    const x = clientX - cRect.left
    const y = clientY - cRect.top
    const now = performance.now()
    const dt = Math.max(0.001, (now - this.lastTime) / 1000)

    if (this.lastX >= 0) {
      const dist = Math.hypot(x - this.lastX, y - this.lastY)
      this.speed = dist / dt // px per second

      // Emit dust particles from velocity if enabled and not over restricted zone
      if (heroEffects.dust && !this.isOverRestrictedZone(x, y) && this.speed > 80) {
        this.emitDust(x, y, dist, (x - this.lastX) / dt, (y - this.lastY) / dt)
      }
    }

    this.lastX = this.currentX
    this.lastY = this.currentY
    this.currentX = x
    this.currentY = y
    this.lastTime = now

    // Loupe speed check: fade out if faster than 600px/s or in restricted zone
    if (this.speed > 600 || this.isOverRestrictedZone(x, y)) {
      this.loupeRestTime = 0
      this.loupeActive = false
    }
  }

  emitDust(x, y, dist, vx, vy) {
    const count = Math.min(4, Math.floor(dist / 25) + 1)
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift()
      }

      // Champagne (#E4C48F) to Gold (#D0A971)
      const isGold = Math.random() > 0.45
      const color = isGold ? 'rgba(208, 169, 113,' : 'rgba(228, 196, 143,'

      this.particles.push({
        x: x + (Math.random() - 0.5) * 12,
        y: y + (Math.random() - 0.5) * 12,
        vx: vx * 0.04 + (Math.random() - 0.5) * 15,
        vy: vy * 0.04 + (Math.random() - 0.5) * 15 - 8,
        radius: 1.2 + Math.random() * 2.2,
        alpha: 0.85 + Math.random() * 0.15,
        life: 1.2,
        age: 0,
        color,
      })
    }
  }

  updateAndDraw(dt) {
    if (!this.ctx || this.canvas.width === 0) return

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    // 1. UPDATE & DRAW DUST PARTICLES
    if (heroEffects.dust && this.particles.length > 0) {
      this.ctx.save()
      this.ctx.scale(this.dpr, this.dpr)
      this.ctx.globalCompositeOperation = 'lighter'

      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i]
        p.age += dt
        if (p.age >= p.life) {
          this.particles.splice(i, 1)
          continue
        }

        // Physic drag and drift
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.vx *= 0.94
        p.vy *= 0.94

        const progress = p.age / p.life
        const opacity = p.alpha * (1 - progress)

        this.ctx.beginPath()
        this.ctx.arc(p.x, p.y, p.radius * (1 - progress * 0.3), 0, Math.PI * 2)
        this.ctx.fillStyle = `${p.color} ${opacity})`
        this.ctx.fill()
      }

      this.ctx.restore()
    }

    // 2. UPDATE & DRAW LOUPE
    if (heroEffects.loupe && this.isFinePointer && this.currentX >= 0) {
      // Resting check (speed < 45 px/s and not in restricted zone)
      if (this.speed < 45 && !this.isOverRestrictedZone(this.currentX, this.currentY)) {
        this.loupeRestTime += dt
        if (this.loupeRestTime >= 0.7) {
          this.loupeActive = true
        }
      } else {
        if (this.speed > 550 || this.isOverRestrictedZone(this.currentX, this.currentY)) {
          this.loupeRestTime = 0
          this.loupeActive = false
        }
      }

      // Grow in / fade out (200ms transition)
      if (this.loupeActive) {
        this.loupeProgress = Math.min(1.0, this.loupeProgress + dt / 0.2)
      } else {
        this.loupeProgress = Math.max(0.0, this.loupeProgress - dt / 0.2)
      }

      if (this.loupeProgress > 0.01 && this.artImg.complete) {
        this.drawLoupe()
      }
    }
  }

  drawLoupe() {
    const ctx = this.ctx
    const x = this.currentX
    const y = this.currentY
    const scale = 0.8 + 0.2 * this.loupeProgress
    const r = this.loupeRadius * scale
    const alpha = this.loupeProgress

    ctx.save()
    ctx.scale(this.dpr, this.dpr)
    ctx.globalAlpha = alpha

    // Circular clip
    ctx.save()
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.clip()

    // Sample magnified 1.6x from artwork
    const cW = this.container.clientWidth
    const cH = this.container.clientHeight
    const mag = this.magnification

    // Draw magnified image centered on current pointer
    const imgAspect = (this.artImg.naturalWidth || 16) / (this.artImg.naturalHeight || 9)
    const contAspect = cW / cH

    let sW, sH
    if (contAspect > imgAspect) {
      sW = cW
      sH = cW / imgAspect
    } else {
      sH = cH
      sW = cH * imgAspect
    }

    const imgX = (cW - sW) * 0.5
    const imgY = (cH - sH) * 0.5

    const destX = x - (x - imgX) * mag
    const destY = y - (y - imgY) * mag

    ctx.drawImage(this.artImg, destX, destY, sW * mag, sH * mag)

    // Inner lens shadow
    const innerShadow = ctx.createRadialGradient(x, y, r * 0.65, x, y, r)
    innerShadow.addColorStop(0, 'rgba(0,0,0,0)')
    innerShadow.addColorStop(1, 'rgba(0,0,0,0.55)')
    ctx.fillStyle = innerShadow
    ctx.fillRect(x - r, y - r, r * 2, r * 2)

    ctx.restore()

    // Thin Brass Ring (1.5px, #D0A971)
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.strokeStyle = '#D0A971'
    ctx.lineWidth = 1.5
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)'
    ctx.shadowBlur = 12
    ctx.stroke()

    // Four Tiny Crosshair Ticks (6px each at 12, 3, 6, 9 o'clock)
    ctx.shadowColor = 'transparent'
    ctx.strokeStyle = '#E4C48F'
    ctx.lineWidth = 1.0

    // Top tick
    ctx.beginPath()
    ctx.moveTo(x, y - r + 2)
    ctx.lineTo(x, y - r + 8)
    ctx.stroke()

    // Bottom tick
    ctx.beginPath()
    ctx.moveTo(x, y + r - 2)
    ctx.lineTo(x, y + r - 8)
    ctx.stroke()

    // Left tick
    ctx.beginPath()
    ctx.moveTo(x - r + 2, y)
    ctx.lineTo(x - r + 8, y)
    ctx.stroke()

    // Right tick
    ctx.beginPath()
    ctx.moveTo(x + r - 2, y)
    ctx.lineTo(x + r - 8, y)
    ctx.stroke()

    ctx.restore()
  }

  destroy() {
    this.particles = []
  }
}
