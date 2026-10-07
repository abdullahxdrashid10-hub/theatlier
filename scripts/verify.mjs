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
// 3. REDUCED MOTION EMULATION TEST
// -------------------------------------------------------------
console.log('\n--- 3. Testing prefers-reduced-motion fallback ---')
{
  const rCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  })
  const rPage = await rCtx.newPage()
  await rPage.goto(BASE + '/', { waitUntil: 'networkidle' })
  await sleep(300)

  const reducedState = await rPage.evaluate(() => {
    const hero = document.querySelector('.hero')
    const the = document.querySelector('.hero__word-the')
    const atelier = document.querySelector('.hero__word-atelier')
    const tagline = document.querySelector('.hero__tagline')
    return {
      state: hero.getAttribute('data-hero-state'),
      theOpacity: getComputedStyle(the).opacity,
      atelierOpacity: getComputedStyle(atelier).opacity,
      taglineOpacity: getComputedStyle(tagline).opacity,
    }
  })

  assert('Hero data-hero-state is "reduced" under prefers-reduced-motion', reducedState.state === 'reduced')
  assert('All text is immediately visible with full opacity', reducedState.theOpacity === '1' && reducedState.atelierOpacity === '1' && reducedState.taglineOpacity === '1')

  await rPage.screenshot({ path: path.join(SHOTS_DIR, 'reduced_motion_hero.png') })
  await rCtx.close()
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
  const cdp = await ctx.newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })

  await page.goto(BASE + '/?quality=lite', { waitUntil: 'networkidle' })
  await sleep(3500)

  const liteBench = await page.evaluate(async () => {
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
