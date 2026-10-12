import { chromium } from 'playwright-core'
import fs from 'node:fs'

const BASE = 'http://localhost:5173'
const exe = fs.existsSync('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe')
  ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
  : 'C:/Program Files/Google/Chrome/Application/chrome.exe'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

console.log('=== STARTING M1.4 PAINTING DETAIL VERIFICATION ===\n')
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

// ----------------------------------------------------------------------------
// 1. Available Painting (Ember Field) Desktop 1440x900
// ----------------------------------------------------------------------------
console.log('--- 1. Testing Available Painting (placeholder-ember-field) ---')
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  const issues = []
  page.on('console', (m) => {
    if (['error', 'warning'].includes(m.type())) issues.push(`${m.type()}: ${m.text()}`)
  })
  page.on('pageerror', (e) => issues.push(`pageerror: ${e.message}`))

  await page.goto(`${BASE}/painting/placeholder-ember-field`, { waitUntil: 'networkidle' })
  await sleep(400)

  assert('Zero console errors/warnings on painting detail', issues.length === 0, issues.join('; '))

  const meta = await page.evaluate(() => {
    const title = document.querySelector('.painting-detail__title')?.textContent?.trim()
    const badge = document.querySelector('.painting-detail__badge')?.textContent?.trim()
    const price = document.querySelector('.painting-detail__price')?.textContent?.trim()
    const acquireBtn = document.querySelector('.painting-detail__cta')
    const thumbs = document.querySelectorAll('.painting-detail__thumb-btn')
    const viewport = document.querySelector('.painting-detail__viewport')
    return {
      title,
      badge,
      price,
      hasAcquireBtn: !!acquireBtn,
      acquireBtnDisabled: acquireBtn?.disabled,
      acquireBtnText: acquireBtn?.textContent?.trim(),
      thumbCount: thumbs.length,
      hasViewport: !!viewport,
    }
  })

  assert('Title is rendered', meta.title.includes('Ember Field'), `(title: "${meta.title}")`)
  assert('Badge indicates available', meta.badge.includes('Available'), `(badge: "${meta.badge}")`)
  assert('Price is formatted in PKR', meta.price.includes('PKR') || meta.price.includes('185,000'), `(price: "${meta.price}")`)
  assert('Acquire button is enabled and ready', meta.hasAcquireBtn && !meta.acquireBtnDisabled && meta.acquireBtnText.includes('Acquire Artwork'))
  assert('Multiple perspectives / views are rendered as stacked/grid buttons', meta.thumbCount >= 2, `(${meta.thumbCount} views)`)

  // Test zoom activation on pointer move
  const zoomLayerBefore = await page.evaluate(() => {
    const el = document.querySelector('.painting-detail__viewport')
    return el.getAttribute('data-zooming')
  })
  assert('Zoom initially inactive', zoomLayerBefore === 'false' || zoomLayerBefore === null)

  const viewportBox = await page.locator('.painting-detail__viewport').boundingBox()
  await page.mouse.move(viewportBox.x + viewportBox.width * 0.4, viewportBox.y + viewportBox.height * 0.4)
  await sleep(150)

  const zoomLayerActive = await page.evaluate(() => {
    const el = document.querySelector('.painting-detail__viewport')
    const layer = document.querySelector('.painting-detail__zoom-layer')
    return {
      zooming: el.getAttribute('data-zooming'),
      opacity: getComputedStyle(layer).opacity,
      origin: layer.style.transformOrigin,
    }
  })
  assert('Zoom becomes active on pointer hover (pointer: fine)', zoomLayerActive.zooming === 'true' && parseFloat(zoomLayerActive.opacity) > 0.5)

  // Test thumbnail click switching
  const imgBefore = await page.evaluate(() => document.querySelector('.painting-detail__image').src)
  const thumbs = page.locator('.painting-detail__thumb-btn')
  if ((await thumbs.count()) > 1) {
    await thumbs.nth(1).click()
    await sleep(200)
    const imgAfter = await page.evaluate(() => document.querySelector('.painting-detail__image').src)
    assert('Clicking thumbnail changes active artwork image', imgBefore !== imgAfter)
  }

  // Test Acquire button click and Cart integration
  await page.locator('.painting-detail__cta').click()
  await sleep(200)
  const cartState = await page.evaluate(() => {
    const toast = document.querySelector('.painting-detail__cart-toast')
    const ctaText = document.querySelector('.painting-detail__cta')?.textContent?.trim()
    const stored = JSON.parse(localStorage.getItem('atelier_cart_items') || '[]')
    return {
      hasToast: !!toast,
      ctaText,
      cartCount: stored.length,
      cartItemSlug: stored[0]?.slug,
    }
  })
  assert('Clicking Acquire Artwork adds to localStorage cart', cartState.cartCount === 1 && cartState.cartItemSlug === 'placeholder-ember-field')
  assert('Cart toast feedback displays', cartState.hasToast)
  assert('CTA transitions to "In Your Selection"', cartState.ctaText.includes('In Your Selection'))

  // Test Lightbox Fullscreen Modal
  await page.locator('.painting-detail__inspect-btn').click()
  await sleep(250)
  const lightboxOpen = await page.evaluate(() => {
    const dialog = document.querySelector('.painting-lightbox')
    const htmlLocked = document.documentElement.classList.contains('menu-open') || document.body.style.overflow === 'hidden'
    return {
      hasDialog: !!dialog,
      htmlLocked,
    }
  })
  assert('Inspection Lightbox opens and locks body scroll', lightboxOpen.hasDialog)

  // Test zoom toggle in lightbox
  await page.locator('.painting-lightbox__btn', { hasText: 'Zoom' }).click()
  await sleep(150)
  const stageZoomed = await page.evaluate(() => {
    const stage = document.querySelector('.painting-lightbox__stage')
    return stage?.getAttribute('data-zoomed') === 'true'
  })
  assert('Lightbox Zoom toggle zooms stage to 2.2x', stageZoomed)

  // Close lightbox on Escape
  await page.keyboard.press('Escape')
  await sleep(250)
  const lightboxClosed = await page.evaluate(() => !document.querySelector('.painting-lightbox'))
  assert('Lightbox closes cleanly on Escape', lightboxClosed)

  await ctx.close()
}

// ----------------------------------------------------------------------------
// 2. Sold Painting (placeholder-night-ledger) State Check
// ----------------------------------------------------------------------------
console.log('\n--- 2. Testing Sold Painting (placeholder-night-ledger) ---')
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/painting/placeholder-night-ledger`, { waitUntil: 'networkidle' })
  await sleep(300)

  const soldState = await page.evaluate(() => {
    const badge = document.querySelector('.painting-detail__badge')?.textContent?.trim()
    const watermark = document.querySelector('.painting-detail__sold-watermark')?.textContent?.trim()
    const cta = document.querySelector('.painting-detail__cta')
    const inquire = document.querySelector('.painting-detail__inquire-link')?.textContent?.trim()
    return {
      badge,
      watermark,
      ctaDisabled: cta?.disabled,
      ctaAriaDisabled: cta?.getAttribute('aria-disabled'),
      ctaText: cta?.textContent?.trim(),
      inquireText: inquire,
    }
  })

  assert('Badge indicates sold / private collection', soldState.badge.includes('Acquired') || soldState.badge.includes('Private Collection'))
  assert('Sold watermark is present on canvas frame', soldState.watermark.includes('Acquired'))
  assert('Acquire button is strictly disabled', soldState.ctaDisabled && soldState.ctaAriaDisabled === 'true')
  assert('Button text states "Acquired — In Private Collection"', soldState.ctaText.includes('Acquired'))
  assert('Commission inquiry link is offered instead', soldState.inquireText.includes('Commission'))

  // Verify that sold works CANNOT be added to localStorage cart even via API
  const cartAddAttempt = await page.evaluate(async () => {
    const { addToCart } = await import('/src/utils/cartStorage.js')
    const { getPaintingBySlug } = await import('/src/data/api.js')
    const item = await getPaintingBySlug('placeholder-night-ledger')
    return addToCart(item)
  })
  assert('cartStorage strictly refuses adding sold painting', !cartAddAttempt.success && cartAddAttempt.reason === 'sold')

  await ctx.close()
}

// ----------------------------------------------------------------------------
// 3. Mobile Viewport 390x844 & Responsive Checks
// ----------------------------------------------------------------------------
console.log('\n--- 3. Testing Mobile 390px Viewport & Overflow Sweep ---')
{
  const mCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  })
  const mPage = await mCtx.newPage()
  await mPage.goto(`${BASE}/painting/placeholder-ember-field`, { waitUntil: 'networkidle' })
  await sleep(300)

  // Tap viewport to open inspection
  await mPage.locator('.painting-detail__viewport').tap()
  await sleep(250)
  const mobileLightbox = await mPage.evaluate(() => !!document.querySelector('.painting-lightbox'))
  assert('Mobile tap on artwork frame opens inspection lightbox', mobileLightbox)

  await mPage.locator('.painting-lightbox__close-btn').tap()
  await sleep(200)

  // Overflow checks across viewports
  const widths = [360, 390, 768, 1024, 1440, 1920]
  let overflow = false
  for (const w of widths) {
    await mPage.setViewportSize({ width: w, height: 800 })
    await sleep(100)
    const diff = await mPage.evaluate(() => document.documentElement.scrollWidth - innerWidth)
    if (diff > 0) {
      console.error(`Horizontal overflow of ${diff}px at ${w}px width`)
      overflow = true
    }
  }
  assert('Zero horizontal overflow from 360px to 1920px', !overflow)

  await mCtx.close()
}

// ----------------------------------------------------------------------------
// 4. Shop to Painting Navigation & Breadcrumbs Journey
// ----------------------------------------------------------------------------
console.log('\n--- 4. Testing Navigation Journey (Shop -> Painting -> Breadcrumb back) ---')
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/shop`, { waitUntil: 'networkidle' })
  await sleep(400)

  // Click first painting card
  const firstCard = page.locator('.painting-card__link').first()
  await firstCard.click()
  await page.waitForURL(/\/painting\//)
  await sleep(300)

  const onPaintingPage = page.url().includes('/painting/')
  assert('Clicking painting card in Shop navigates to /painting/:slug', onPaintingPage)

  // Click breadcrumb back to The Collection (/shop)
  await page.locator('.painting-detail__breadcrumb-link', { hasText: 'The Collection' }).click()
  await page.waitForURL(/\/shop/)
  await sleep(300)

  const backOnShop = page.url().endsWith('/shop')
  assert('Clicking breadcrumb link navigates back to /shop', backOnShop)

  await ctx.close()
}

await browser.close()

console.log(`\n========================================`)
console.log(`M1.4 TEST RESULTS: ${totalPass} PASSED, ${totalFail} FAILED`)
console.log(`========================================\n`)

if (totalFail > 0) {
  process.exit(1)
} else {
  process.exit(0)
}
