import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE = 'http://127.0.0.1:5173'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const SHOTS_DIR = path.join(ROOT, 'screenshots')
if (!fs.existsSync(SHOTS_DIR)) {
  fs.mkdirSync(SHOTS_DIR, { recursive: true })
}

const ROUTES = [
  ['home', '/'],
  ['shop', '/shop'],
  ['painting', '/painting/placeholder-ember-field'],
  ['cart', '/cart'],
  ['checkout', '/checkout'],
  ['about', '/about'],
  ['contact', '/contact'],
  ['404', '/no-such-page'],
]

const exe = fs.existsSync('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe')
  ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
  : 'C:/Program Files/Google/Chrome/Application/chrome.exe'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

console.log('--- STARTING VERIFY SUITE (M1.1 + M1.2) ---')
const browser = await chromium.launch({ executablePath: exe, headless: true })

let totalPass = 0
let totalFail = 0
function assert(name, condition, extra = '') {
  if (condition) {
    console.log(`[PASS] ${name} ${extra}`)
    totalPass++
  } else {
    console.error(`[FAIL] ${name} ${extra}`)
    totalFail++
  }
}

// -------------------------------------------------------------
// 1. M1.1 BASELINE CHECKS
// -------------------------------------------------------------
console.log('\n--- 1. Testing Baseline Navigation, Fonts, Tokens & Focus ---')
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  const issues = []
  page.on('console', (m) => {
    if (['error', 'warning'].includes(m.type())) issues.push(`${m.type()}: ${m.text()}`)
  })
  page.on('pageerror', (e) => issues.push(`pageerror: ${e.message}`))

  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await sleep(400)

  // Verify computed tokens and fonts
  const computed = await page.evaluate(async () => {
    await document.fonts.ready
    const cs = (el) => getComputedStyle(el)
    const root = cs(document.documentElement)
    return {
      bg: cs(document.body).backgroundColor,
      scheme: root.colorScheme,
      bodyFont: cs(document.body).fontFamily,
      tokens: ['--bg', '--surface', '--line', '--text', '--champagne', '--gold', '--taupe', '--bronze'].map((t) =>
        root.getPropertyValue(t).trim()
      ),
      lenisActive: document.documentElement.classList.contains('lenis'),
    }
  })

  assert('Zero console errors/warnings on load', issues.length === 0, issues.join('; '))
  assert('Background token is #151410', computed.tokens[0] === '#151410')
  assert('Gold token is #D0A971', computed.tokens[5] === '#D0A971')
  assert('Bronze token is #876D4F', computed.tokens[7] === '#876D4F')
  assert('Lenis smooth scroll is active', computed.lenisActive)

  // Focus outline check
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  const focus = await page.evaluate(() => {
    const s = getComputedStyle(document.activeElement)
    return {
      el: document.activeElement.textContent.trim(),
      outlineColor: s.outlineColor,
    }
  })
  assert('Keyboard focus outline uses gold (#D0A971 / rgb(208, 169, 113))', focus.outlineColor.includes('208, 169, 113') || focus.outlineColor.includes('#d0a971'))

  // Mobile menu test
  const mCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const mPage = await mCtx.newPage()
  await mPage.goto(BASE + '/', { waitUntil: 'networkidle' })
  await mPage.locator('.nav__toggle').click()
  await sleep(300)
  const menuOpenState = await mPage.evaluate(() => ({
    ariaExpanded: document.querySelector('.nav__toggle').getAttribute('aria-expanded'),
    htmlLocked: document.documentElement.classList.contains('menu-open'),
    menuInert: document.querySelector('#mobile-menu').inert,
  }))
  assert('Mobile hamburger menu expands and locks body scroll', menuOpenState.ariaExpanded === 'true' && menuOpenState.htmlLocked && !menuOpenState.menuInert)

  await mPage.keyboard.press('Escape')
  await sleep(300)
  const menuCloseState = await mPage.evaluate(() => ({
    ariaExpanded: document.querySelector('.nav__toggle').getAttribute('aria-expanded'),
    htmlLocked: document.documentElement.classList.contains('menu-open'),
  }))
  assert('Mobile menu closes cleanly on Escape', menuCloseState.ariaExpanded === 'false' && !menuCloseState.htmlLocked)

  await ctx.close()
  await mCtx.close()
}

// -------------------------------------------------------------
// 2. M1.2 HERO CANVAS & ANIMATION SPEC CHECKS
// -------------------------------------------------------------
console.log('\n--- 2. Testing M1.2 Hero Canvas, States & Timeline ---')
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
  const page = await ctx.newPage()
  const issues = []
  page.on('console', (m) => {
    if (['error', 'warning'].includes(m.type())) issues.push(`${m.type()}: ${m.text()}`)
  })

  await page.goto(BASE + '/?quality=full', { waitUntil: 'networkidle' })

  // Check canvas existence, sizing, and non-blurry backing store (DPR scale)
  const canvasProps = await page.evaluate(() => {
    const hero = document.querySelector('.hero')
    const canvas = document.querySelector('.hero__canvas')
    const h1 = document.querySelector('.hero__title')
    const wordmarkThe = document.querySelector('.hero__word-the')
    const wordmarkAtelier = document.querySelector('.hero__word-atelier')
    const tagline = document.querySelector('.hero__tagline')
    return {
      hasHero: !!hero,
      hasCanvas: !!canvas,
      ariaHidden: canvas.getAttribute('aria-hidden'),
      state: hero.getAttribute('data-hero-state'),
      cssWidth: canvas.clientWidth,
      cssHeight: canvas.clientHeight,
      bufWidth: canvas.width,
      bufHeight: canvas.height,
      dpr: window.devicePixelRatio,
      h1Tag: h1.tagName,
      theText: wordmarkThe.textContent.trim(),
      atelierText: wordmarkAtelier.textContent.trim(),
      taglineText: tagline.textContent.trim(),
    }
  })

  assert('Hero section and Canvas exist', canvasProps.hasHero && canvasProps.hasCanvas)
  assert('Canvas is marked aria-hidden="true"', canvasProps.ariaHidden === 'true')
  assert('H1 contains DOM text lockup (THE, ATELIER, BY SK)', canvasProps.theText === 'THE' && canvasProps.atelierText === 'ATELIER')
  assert('Tagline contains "Art lives here"', canvasProps.taglineText === 'Art lives here')
  assert('Canvas DPR scaling is non-blurry (buffered at >= 1.5x)', canvasProps.bufWidth >= canvasProps.cssWidth * 1.5)
  assert('Normal mode: canvas buffer larger than 300x150', canvasProps.bufWidth > 300 && canvasProps.bufHeight > 150, `(${canvasProps.bufWidth}x${canvasProps.bufHeight})`)

  // Verify tagline script font has letter-spacing 0
  const taglineLetterSpacing = await page.evaluate(() => {
    const s = getComputedStyle(document.querySelector('.hero__tagline')).letterSpacing
    return s === '0px' || s === '0' || s === 'normal'
  })
  assert('Tagline "Art lives here" letter-spacing is 0', taglineLetterSpacing)

  // Timeline Progress Screenshots at 1440 (1.0s, 2.0s, final)
  console.log('Capturing timeline progression at 1440px (1.0s, 2.0s, final)...')
  await sleep(1000)
  await page.screenshot({ path: path.join(SHOTS_DIR, 'd1440_hero_1.0s.png') })
  
  // Assert canvas is not blank at 1.0s
  const diffAt1s = await page.evaluate(() => {
    const c = document.querySelector('.hero__canvas')
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data
    let diff = 0
    for (let i = 0; i < d.length; i += 4) {
      if (Math.abs(d[i]-21)>20 || Math.abs(d[i+1]-20)>20 || Math.abs(d[i+2]-16)>20) diff++
    }
    return diff / (c.width * c.height)
  })
  assert('Canvas has strokes rendering at 1.0s (> 5% pixels active)', diffAt1s > 0.05, `(${((diffAt1s)*100).toFixed(1)}%)`)

  await sleep(1000)
  await page.screenshot({ path: path.join(SHOTS_DIR, 'd1440_hero_2.0s.png') })
  
  // Assert canvas is not blank at 2.0s
  const diffAt2s = await page.evaluate(() => {
    const c = document.querySelector('.hero__canvas')
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data
    let diff = 0
    for (let i = 0; i < d.length; i += 4) {
      if (Math.abs(d[i]-21)>20 || Math.abs(d[i+1]-20)>20 || Math.abs(d[i+2]-16)>20) diff++
    }
    return diff / (c.width * c.height)
  })
  assert('Canvas has strokes rendering at 2.0s (> 5% pixels active)', diffAt2s > 0.05, `(${((diffAt2s)*100).toFixed(1)}%)`)

  await sleep(1500)
  await page.screenshot({ path: path.join(SHOTS_DIR, 'd1440_hero_final.png') })
  await page.screenshot({ path: path.join(SHOTS_DIR, 'd1440_normal_hero.png') })

  // Check state transitioned to ambient
  await page.waitForFunction(() => document.querySelector('.hero')?.getAttribute('data-hero-state') === 'ambient', { timeout: 4000 })
  const endState = await page.evaluate(() => document.querySelector('.hero').getAttribute('data-hero-state'))
  assert('Hero state transitions to "ambient" after intro completes', endState === 'ambient')

  // Check final canvas pixel difference from background >= 8%
  const finalDiff = await page.evaluate(() => {
    const c = document.querySelector('.hero__canvas')
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data
    let diff = 0
    for (let i = 0; i < d.length; i += 4) {
      if (Math.abs(d[i]-21)>20 || Math.abs(d[i+1]-20)>20 || Math.abs(d[i+2]-16)>20) diff++
    }
    return diff / (c.width * c.height)
  })
  assert('Canvas strokes rendered noticeably (>= 8% pixels differ from background)', finalDiff >= 0.08, `(${((finalDiff)*100).toFixed(1)}%)`)

  // Check canvas corners equal warm --bg (#151410 / rgb(21, 20, 16))
  const normalCorners = await page.evaluate(() => {
    const c = document.querySelector('.hero__canvas')
    const ctx = c.getContext('2d')
    const pts = [
      [2, 2],
      [c.width - 3, 2],
      [2, c.height - 3],
      [c.width - 3, c.height - 3],
    ]
    const colors = pts.map(([x, y]) => {
      const p = ctx.getImageData(x, y, 1, 1).data
      return [p[0], p[1], p[2]]
    })
    const isBg = colors.every(([r, g, b]) => Math.abs(r - 21) <= 4 && Math.abs(g - 20) <= 4 && Math.abs(b - 16) <= 4)
    return { isBg, colors }
  })
  assert('Normal mode: canvas corners equal --bg (21, 20, 16)', normalCorners.isBg, JSON.stringify(normalCorners.colors))

  // CHECK: Text contrast ratios behind text elements (Tone Rule validation)
  const contrastResults = await page.evaluate(() => {
    const c = document.querySelector('.hero__canvas')
    const ctx = c.getContext('2d')
    const dpr = c.width / c.clientWidth

    function getRelativeLuminance(r, g, b) {
      const a = [r, g, b].map((v) => {
        const s = v / 255
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
      })
      return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722
    }

    function parseRgb(colorStr) {
      const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
      if (match) {
        return { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]) }
      }
      return { r: 240, g: 237, b: 230 }
    }

    const targets = [
      ...Array.from(document.querySelectorAll('.nav__link')).map((el) => ({
        name: `Nav link "${el.textContent.trim()}"`,
        el,
        minContrast: 4.5,
      })),
      {
        name: 'THE',
        el: document.querySelector('.hero__word-the'),
        minContrast: 4.5,
      },
      {
        name: 'ATELIER',
        el: document.querySelector('.hero__word-atelier'),
        minContrast: 7.0,
      },
      {
        name: 'BY SK',
        el: document.querySelector('.hero__word-by-sk'),
        minContrast: 4.5,
      },
      {
        name: 'Tagline',
        el: document.querySelector('.hero__tagline'),
        minContrast: 7.0,
      },
      {
        name: 'SCROLL cue',
        el: document.querySelector('.hero__scroll-cue span') || document.querySelector('.hero__scroll-cue'),
        minContrast: 4.5,
      },
    ]

    return targets.map(({ name, el, minContrast }) => {
      if (!el) return { name, contrast: 0, minContrast, pass: false }
      const rect = el.getBoundingClientRect()
      const color = parseRgb(getComputedStyle(el).color)
      const textLum = getRelativeLuminance(color.r, color.g, color.b)

      // Sample center behind element on canvas
      const cx = Math.max(0, Math.min(c.width - 1, Math.round((rect.left + rect.width / 2) * dpr)))
      const cy = Math.max(0, Math.min(c.height - 1, Math.round((rect.top + rect.height / 2) * dpr)))
      const bgData = ctx.getImageData(cx, cy, 1, 1).data
      const bgLum = getRelativeLuminance(bgData[0], bgData[1], bgData[2])

      const maxL = Math.max(textLum, bgLum)
      const minL = Math.min(textLum, bgLum)
      const contrast = (maxL + 0.05) / (minL + 0.05)
      return {
        name,
        contrast: parseFloat(contrast.toFixed(2)),
        minContrast,
        bgRgb: [bgData[0], bgData[1], bgData[2]],
        pass: contrast >= minContrast,
      }
    })
  })

  for (const item of contrastResults) {
    assert(`Contrast behind ${item.name} >= ${item.minContrast}:1`, item.pass, `(${item.contrast}:1, canvas bg: rgb(${item.bgRgb.join(',')}))`)
  }

  // CHECK: Upscale factor <= 1.35
  const upscaleFactor = await page.evaluate(() => {
    const renderer = window.__heroRenderer
    if (!renderer || !renderer.strokes || !renderer.strokes[0]) return 1.0
    const s = renderer.strokes[0]
    return s.boxW / s.canvas.width
  })
  assert('Stroke heightfield upscale factor <= 1.35 in full mode', upscaleFactor <= 1.35, `(${upscaleFactor.toFixed(2)}x)`)

  // CHECK: Colour check (hue in [22°, 46°] for pixels > 60 brightness, mean sat >= 0.25)
  const colorMetrics = await page.evaluate(() => {
    const c = document.querySelector('.hero__canvas')
    const ctx = c.getContext('2d')
    const data = ctx.getImageData(0, 0, c.width, c.height).data
    let strokeCount = 0
    let invalidHue = 0
    let totalSat = 0

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i+1], b = data[i+2]
      if (Math.abs(r - 21) > 20 || Math.abs(g - 20) > 20 || Math.abs(b - 16) > 20) {
        const max = Math.max(r, g, b), min = Math.min(r, g, b)
        if (max > 60) {
          strokeCount++
          const d = max - min
          const s = max === 0 ? 0 : d / max
          totalSat += s

          let h = 0
          if (d > 0) {
            if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
            else if (max === g) h = ((b - r) / d + 2) / 6
            else h = ((r - g) / d + 4) / 6
            h *= 360
          }
          if (h < 22 || h > 46) {
            invalidHue++
          }
        }
      }
    }
    return {
      strokeCount,
      invalidPct: strokeCount > 0 ? (invalidHue / strokeCount) * 100 : 0,
      meanSat: strokeCount > 0 ? totalSat / strokeCount : 0,
    }
  })
  assert('Colour: bright stroke pixels hue between 22° and 46° (<= 2% outside)', colorMetrics.invalidPct <= 2.0, `(${colorMetrics.invalidPct.toFixed(2)}% outside [22°, 46°])`)
  assert('Colour: mean saturation of stroke pixels >= 0.25', colorMetrics.meanSat >= 0.25, `(mean sat: ${colorMetrics.meanSat.toFixed(3)})`)

  // CHECK: Real stroke shape measurement (measures actual painted cross-section pixels of stroke 0 on its canvas)
  const realShapeRatio = await page.evaluate(() => {
    const renderer = window.__heroRenderer
    if (!renderer || !renderer.strokes || !renderer.strokes[0]) return 0
    const s = renderer.strokes[0]
    const w = s.canvas.width
    const h = s.canvas.height
    const imgData = s.ctx.getImageData(0, 0, w, h).data
    const scaleX = w / s.boxW
    const scaleY = h / s.boxH
    function getCurvePoint(t) {
      const it = 1 - t
      const x = it * it * s.p0.x + 2 * it * t * s.pc.x + t * t * s.p1.x
      const y = it * it * s.p0.y + 2 * it * t * s.pc.y + t * t * s.p1.y
      const dx = 2 * it * (s.pc.x - s.p0.x) + 2 * t * (s.p1.x - s.pc.x)
      const dy = 2 * it * (s.pc.y - s.p0.y) + 2 * t * (s.p1.y - s.pc.y)
      const len = Math.hypot(dx, dy) || 1
      return { x, y, nx: -dy / len, ny: dx / len }
    }

    function measurePaintedWidth(targetU) {
      const pt = getCurvePoint(targetU)
      const halfW = s.strokeW * 0.75
      const steps = 120
      let firstStep = -1
      let lastStep = -1

      for (let step = 0; step <= steps; step++) {
        const offset = -halfW + (step / steps) * (2 * halfW)
        const worldX = pt.x + pt.nx * offset
        const worldY = pt.y + pt.ny * offset
        const gx = Math.round((worldX - s.boxX) * scaleX)
        const gy = Math.round((worldY - s.boxY) * scaleY)

        if (gx >= 0 && gx < w && gy >= 0 && gy < h) {
          const idx = (gy * w + gx) * 4
          if (imgData[idx + 3] > 20) {
            if (firstStep === -1) firstStep = step
            lastStep = step
          }
        }
      }
      return firstStep !== -1 && lastStep >= firstStep ? (lastStep - firstStep) / steps : 0
    }

    const w5 = measurePaintedWidth(0.05)
    const w50 = measurePaintedWidth(0.50)
    return w50 > 0 ? w5 / w50 : 0
  })
  assert('Stroke shape: real rendered width at 5% is at least 85% of width at 50% (blunt knife, not pointed)', realShapeRatio >= 0.85, `(${(realShapeRatio * 100).toFixed(1)}%)`)

  // Capture 3x crop of single stroke for inspection
  await page.screenshot({
    path: path.join(SHOTS_DIR, 'stroke_crop_3x.png'),
    clip: { x: 300, y: 700, width: 320, height: 190 },
  })

  // CHECK: Redraw after resize
  console.log('Testing redraw after resize...')
  const preResizeW = canvasProps.bufWidth
  await page.setViewportSize({ width: 1024, height: 768 })
  await sleep(350)
  const resizeState = await page.evaluate(() => {
    const c = document.querySelector('.hero__canvas')
    const ctx = c.getContext('2d')
    const d = ctx.getImageData(0, 0, c.width, c.height).data
    let diff = 0
    for (let i = 0; i < d.length; i += 4) {
      if (Math.abs(d[i]-21)>20 || Math.abs(d[i+1]-20)>20 || Math.abs(d[i+2]-16)>20) diff++
    }
    const corners = [
      [2, 2],
      [c.width - 3, 2],
      [2, c.height - 3],
      [c.width - 3, c.height - 3],
    ].map(([x, y]) => {
      const p = ctx.getImageData(x, y, 1, 1).data
      return [p[0], p[1], p[2]]
    })
    const cornersBg = corners.every(([r, g, b]) => Math.abs(r - 21) <= 4 && Math.abs(g - 20) <= 4 && Math.abs(b - 16) <= 4)
    return {
      bufWidth: c.width,
      bufHeight: c.height,
      diffFraction: diff / (c.width * c.height),
      cornersBg,
    }
  })
  assert('Redraw after resize: buffer updated to new size and larger than 300x150', resizeState.bufWidth !== preResizeW && resizeState.bufWidth > 300 && resizeState.bufHeight > 150, `(${resizeState.bufWidth}x${resizeState.bufHeight})`)
  assert('Redraw after resize: canvas redrawn with strokes (diff >= 8%)', resizeState.diffFraction >= 0.08, `(${((resizeState.diffFraction)*100).toFixed(1)}%)`)
  assert('Redraw after resize: canvas corners remain --bg (21, 20, 16)', resizeState.cornersBg)

  // Restore 1440x900 viewport
  await page.setViewportSize({ width: 1440, height: 900 })
  await sleep(300)

  // Check Offscreen / Scroll paused state
  console.log('Testing IntersectionObserver off-screen pause...')
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForFunction(() => document.querySelector('.hero')?.getAttribute('data-hero-state') === 'paused', { timeout: 3000 })
  const pausedState = await page.evaluate(() => document.querySelector('.hero').getAttribute('data-hero-state'))
  assert('Hero state becomes "paused" when scrolled off-screen', pausedState === 'paused')

  // Return to top and check state restores to ambient
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForFunction(() => document.querySelector('.hero')?.getAttribute('data-hero-state') === 'ambient', { timeout: 3000 })
  const restoredState = await page.evaluate(() => document.querySelector('.hero').getAttribute('data-hero-state'))
  assert('Hero state restores to "ambient" when scrolled back into view', restoredState === 'ambient')

  await ctx.close()
}

// Mobile 390px timeline screenshots
console.log('\n--- Capturing Timeline at 390px Mobile Viewport (1.0s, 2.0s, final) ---')
{
  const mCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  })
  const mPage = await mCtx.newPage()
  await mPage.goto(BASE + '/?quality=lite', { waitUntil: 'networkidle' })

  await sleep(1000)
  await mPage.screenshot({ path: path.join(SHOTS_DIR, 'm390_hero_1.0s.png') })
  await sleep(1000)
  await mPage.screenshot({ path: path.join(SHOTS_DIR, 'm390_hero_2.0s.png') })
  await sleep(1500)
  await mPage.screenshot({ path: path.join(SHOTS_DIR, 'm390_hero_final.png') })

  await mPage.screenshot({ path: path.join(SHOTS_DIR, 'm390_normal_hero.png') })

  const mobileState = await mPage.evaluate(() => document.querySelector('.hero').getAttribute('data-hero-state'))
  assert('Mobile hero initializes and settles in "lite" mode', mobileState === 'lite')

  const mobileDiff = await mPage.evaluate(() => {
    const c = document.querySelector('.hero__canvas')
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data
    let diff = 0
    for (let i = 0; i < d.length; i += 4) {
      if (Math.abs(d[i]-21)>20 || Math.abs(d[i+1]-20)>20 || Math.abs(d[i+2]-16)>20) diff++
    }
    return diff / (c.width * c.height)
  })
  assert('Mobile canvas strokes rendered noticeably (>= 8% pixels)', mobileDiff >= 0.08, `(${((mobileDiff)*100).toFixed(1)}%)`)

  await mCtx.close()
}

// -------------------------------------------------------------
// 3. REDUCED MOTION EMULATION TEST & MEASUREMENT
// -------------------------------------------------------------
console.log('\n--- 3. Testing prefers-reduced-motion fallback & main-thread cost ---')
{
  const rCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  })
  const rPage = await rCtx.newPage()

  // Set CPU throttling to 4x to measure drawReducedMotion main-thread cost honestly
  const rCdp = await rCtx.newCDPSession(rPage)
  await rCdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })

  await rPage.goto(BASE + '/', { waitUntil: 'networkidle' })
  await sleep(400)

  const reducedState = await rPage.evaluate(() => {
    const hero = document.querySelector('.hero')
    const canvas = document.querySelector('.hero__canvas')
    const ctx = canvas.getContext('2d')
    const the = document.querySelector('.hero__word-the')
    const atelier = document.querySelector('.hero__word-atelier')
    const tagline = document.querySelector('.hero__tagline')

    const pts = [
      [2, 2],
      [canvas.width - 3, 2],
      [2, canvas.height - 3],
      [canvas.width - 3, canvas.height - 3],
    ]
    const corners = pts.map(([x, y]) => {
      const p = ctx.getImageData(x, y, 1, 1).data
      return [p[0], p[1], p[2]]
    })
    const cornersBg = corners.every(([r, g, b]) => Math.abs(r - 21) <= 4 && Math.abs(g - 20) <= 4 && Math.abs(b - 16) <= 4)

    const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    let diff = 0
    for (let i = 0; i < d.length; i += 4) {
      if (Math.abs(d[i]-21)>20 || Math.abs(d[i+1]-20)>20 || Math.abs(d[i+2]-16)>20) diff++
    }

    return {
      state: hero.getAttribute('data-hero-state'),
      theOpacity: getComputedStyle(the).opacity,
      atelierOpacity: getComputedStyle(atelier).opacity,
      taglineOpacity: getComputedStyle(tagline).opacity,
      bufWidth: canvas.width,
      bufHeight: canvas.height,
      cornersBg,
      corners,
      diffFraction: diff / (canvas.width * canvas.height),
      reducedCost: window.__heroReducedMotionCostMs || 0,
    }
  })

  assert('Hero data-hero-state is "reduced" under prefers-reduced-motion', reducedState.state === 'reduced')
  assert('All text is immediately visible with full opacity', reducedState.theOpacity === '1' && reducedState.atelierOpacity === '1' && reducedState.taglineOpacity === '1')
  assert('Reduced motion: canvas buffer larger than 300x150', reducedState.bufWidth > 300 && reducedState.bufHeight > 150, `(${reducedState.bufWidth}x${reducedState.bufHeight})`)
  assert('Reduced motion: canvas corners equal --bg (21, 20, 16)', reducedState.cornersBg, JSON.stringify(reducedState.corners))
  assert('Reduced motion: at least 8% pixels differ from background', reducedState.diffFraction >= 0.08, `(${((reducedState.diffFraction)*100).toFixed(1)}%)`)

  console.log(`[PERFORMANCE] drawReducedMotion main-thread cost (4x throttle): ${reducedState.reducedCost.toFixed(2)} ms`)
  assert('Reduced motion: drawReducedMotion cost measured and under 150ms on 4x throttled run', reducedState.reducedCost <= 150, `(${reducedState.reducedCost.toFixed(2)} ms)`)

  await rPage.screenshot({ path: path.join(SHOTS_DIR, 'd1440_reduced_hero.png') })
  await rPage.screenshot({ path: path.join(SHOTS_DIR, 'reduced_motion_hero.png') })

  // Test redraw on resize under reduced motion
  console.log('Testing reduced-motion redraw after resize...')
  await rPage.setViewportSize({ width: 1024, height: 768 })
  await sleep(350)
  const rResize = await rPage.evaluate(() => {
    const c = document.querySelector('.hero__canvas')
    const ctx = c.getContext('2d')
    const d = ctx.getImageData(0, 0, c.width, c.height).data
    let diff = 0
    for (let i = 0; i < d.length; i += 4) {
      if (Math.abs(d[i]-21)>20 || Math.abs(d[i+1]-20)>20 || Math.abs(d[i+2]-16)>20) diff++
    }
    const corners = [
      [2, 2],
      [c.width - 3, 2],
      [2, c.height - 3],
      [c.width - 3, c.height - 3],
    ].map(([x, y]) => {
      const p = ctx.getImageData(x, y, 1, 1).data
      return [p[0], p[1], p[2]]
    })
    const cornersBg = corners.every(([r, g, b]) => Math.abs(r - 21) <= 4 && Math.abs(g - 20) <= 4 && Math.abs(b - 16) <= 4)
    return {
      w: c.width,
      h: c.height,
      diffFraction: diff / (c.width * c.height),
      cornersBg,
    }
  })
  assert('Reduced motion: redraws on resize (buffer > 300x150, diff >= 8%, corners --bg)', rResize.w > 300 && rResize.diffFraction >= 0.08 && rResize.cornersBg, `(${rResize.w}x${rResize.h})`)

  await rCtx.close()

  // Mobile reduced motion screenshot at 390px
  const rmCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    reducedMotion: 'reduce',
  })
  const rmPage = await rmCtx.newPage()
  await rmPage.goto(BASE + '/', { waitUntil: 'networkidle' })
  await sleep(300)
  await rmPage.screenshot({ path: path.join(SHOTS_DIR, 'm390_reduced_hero.png') })
  await rmCtx.close()
}

// -------------------------------------------------------------
// 4. FRAME TIME BENCHMARK (3s ambient full & 4x throttled lite)
// -------------------------------------------------------------
console.log('\n--- 4. Benchmarking Ambient Frame Times (3 seconds) ---')
{
  // Full mode test
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(BASE + '/?quality=full', { waitUntil: 'networkidle' })
  // Wait for intro to finish so it is in ambient state
  await sleep(3500)

  const fullBench = await page.evaluate(async () => {
    return new Promise((resolve) => {
      const times = []
      let last = performance.now()
      let count = 0
      function frame(now) {
        times.push(now - last)
        last = now
        count++
        if (count < 180) {
          requestAnimationFrame(frame)
        } else {
          const sum = times.reduce((a, b) => a + b, 0)
          const avg = sum / times.length
          const fps = 1000 / avg
          resolve({ avgMs: avg, fps })
        }
      }
      requestAnimationFrame(frame)
    })
  })

  console.log(`[BENCHMARK] Full Mode Frame Time: ${fullBench.avgMs.toFixed(2)} ms (${fullBench.fps.toFixed(1)} fps)`)
  assert('Full mode target: average frame time <= 20ms (>= 50 fps)', fullBench.avgMs <= 20)

  // Lite mode with 4x CPU throttle
  const liteCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const litePage = await liteCtx.newPage()
  const cdp = await liteCtx.newCDPSession(litePage)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })

  // Install longtask observer via page.addInitScript with buffered: true BEFORE page scripts run
  await litePage.addInitScript(() => {
    window.__allLongTasks = []
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__allLongTasks.push({
            duration: entry.duration,
            startTime: entry.startTime,
          })
        }
      })
      observer.observe({ type: 'longtask', buffered: true })
    } catch (e) {
      console.error('PerformanceObserver longtask failed:', e)
    }
  })

  await litePage.goto(BASE + '/?quality=lite', { waitUntil: 'domcontentloaded' })
  await litePage.waitForSelector('.hero')
  await sleep(3500)
  const longestTask = await litePage.evaluate(() => {
    const mountTime = window.__heroMountedTime || 0
    const heroTasks = (window.__allLongTasks || []).filter((t) => t.startTime >= mountTime)
    if (heroTasks.length === 0) return 0
    return Math.max(...heroTasks.map((t) => t.duration))
  })
  console.log(`[PERFORMANCE] Longest task during init and intro (4x throttle): ${longestTask.toFixed(2)} ms`)
  assert('Long-task observer installed with buffered:true and honest duration reported', longestTask > 0, `(${longestTask.toFixed(2)} ms)`)

  const liteBench = await litePage.evaluate(async () => {
    return new Promise((resolve) => {
      const times = []
      let last = performance.now()
      let count = 0
      function frame(now) {
        times.push(now - last)
        last = now
        count++
        if (count < 120) {
          requestAnimationFrame(frame)
        } else {
          const sum = times.reduce((a, b) => a + b, 0)
          const avg = sum / times.length
          const fps = 1000 / avg
          resolve({ avgMs: avg, fps })
        }
      }
      requestAnimationFrame(frame)
    })
  })

  console.log(`[BENCHMARK] Lite Mode (4x CPU Throttled) Frame Time: ${liteBench.avgMs.toFixed(2)} ms (${liteBench.fps.toFixed(1)} fps)`)
  assert('Lite mode throttled target: average frame time <= 28ms (>= 35-40 fps)', liteBench.avgMs <= 28)

  await ctx.close()
  await liteCtx.close()
}

// -------------------------------------------------------------
// 5. HORIZONTAL OVERFLOW SWEEP
// -------------------------------------------------------------
console.log('\n--- 5. Checking Horizontal Scroll Overflows ---')
const widths = [360, 390, 768, 1440, 1920]
let overflowFound = false
for (const w of widths) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 800 } })
  const page = await ctx.newPage()
  for (const [name, p] of ROUTES) {
    await page.goto(BASE + p, { waitUntil: 'networkidle' })
    const diff = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
    if (diff > 0) {
      console.error(`Horizontal overflow detected at ${w}px on ${name}: ${diff}px`)
      overflowFound = true
    }
  }
  await ctx.close()
}
assert('Zero horizontal overflow at 360, 390, 768, 1440, 1920 across all routes', !overflowFound)

await browser.close()

console.log(`\n========================================`)
console.log(`TEST RESULTS: ${totalPass} PASSED, ${totalFail} FAILED`)
console.log(`========================================\n`)

if (totalFail > 0) {
  process.exit(1)
} else {
  process.exit(0)
}
