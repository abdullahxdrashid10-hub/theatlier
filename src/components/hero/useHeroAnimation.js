import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { PaintHeroRenderer } from './renderer'

gsap.registerPlugin(ScrollTrigger)

// Module-level flag: if true, subsequent visits skip the intro
let hasPlayedHeroIntro = false

export function resetHeroPlayedFlag() {
  hasPlayedHeroIntro = false
}

export function useHeroAnimation({
  containerRef,
  canvasRef,
  theRef,
  atelierRef,
  bySkWrapperRef,
  ruleLeftRef,
  ruleRightRef,
  taglineRef,
  taglineLineRef,
  scrollCueRef,
}) {
  const [heroState, setHeroState] = useState(() => {
    if (typeof window === 'undefined') return 'intro'
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'reduced'
    if (hasPlayedHeroIntro) return 'ambient'
    const sp = new URLSearchParams(window.location.search)
    const qo = sp.get('quality')
    if (qo === 'lite') return 'lite'
    if (qo === 'full') return 'intro'
    if ((navigator.hardwareConcurrency || 4) <= 4 || (navigator.deviceMemory || 4) <= 4 || window.innerWidth < 768) {
      return 'lite'
    }
    return 'intro'
  })
  const rendererRef = useRef(null)
  const isPausedRef = useRef(false)
  const stateRef = useRef(heroState)

  useEffect(() => {
    stateRef.current = heroState
  }, [heroState])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    // 1. Quality detection
    const searchParams = new URLSearchParams(window.location.search)
    const qualityOverride = searchParams.get('quality')
    const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let isLite = false
    if (qualityOverride === 'lite') {
      isLite = true
    } else if (qualityOverride === 'full') {
      isLite = false
    } else {
      const hwConc = navigator.hardwareConcurrency || 4
      const devMem = navigator.deviceMemory || 4
      const isSmallScreen = window.innerWidth < 768
      if (hwConc <= 4 || devMem <= 4 || isSmallScreen) {
        isLite = true
      }
    }

    let renderer
    try {
      renderer = new PaintHeroRenderer(canvas, { lite: isLite })
      rendererRef.current = renderer
    } catch (e) {
      console.warn('Canvas 2D failed to initialize, relying on CSS fallback:', e)
      return
    }

    if (isReducedMotion) {
      renderer.drawReducedMotion()
      return
    }

    // 2. Initial sizing
    const rect = container.getBoundingClientRect()
    renderer.resize(rect.width, rect.height, true)

    // ResizeObserver
    let resizeTimer = null
    const ro = new ResizeObserver((entries) => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect
          if (width > 0 && height > 0) {
            renderer.resize(width, height)
            if (stateRef.current === 'ambient') {
              renderer.render(1.0, true)
            }
          }
        }
      }, 100)
    })
    ro.observe(container)

    // Pointer events (interactive lighting)
    const handlePointerMove = (e) => {
      const cRect = container.getBoundingClientRect()
      const nx = (e.clientX - cRect.left) / cRect.width
      const ny = (e.clientY - cRect.top) / cRect.height
      renderer.setPointer(Math.min(1, Math.max(0, nx)), Math.min(1, Math.max(0, ny)))
    }
    window.addEventListener('pointermove', handlePointerMove, { passive: true })

    // IntersectionObserver & Document visibility
    const checkPauseState = () => {
      const isHidden = document.hidden
      const isOffscreen = isPausedRef.current

      if (isHidden || isOffscreen) {
        setHeroState('paused')
      } else {
        setHeroState(hasPlayedHeroIntro ? (renderer.lite ? 'lite' : 'ambient') : 'intro')
      }
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        isPausedRef.current = !entry.isIntersecting
        checkPauseState()
      },
      { threshold: 0.05 }
    )
    io.observe(container)

    const handleVisibilityChange = () => {
      checkPauseState()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Frame-time monitor for auto-downgrade
    let frameTimes = []
    let lastTime = performance.now()
    let autoDowngraded = false

    const strokeAnim = { progress: hasPlayedHeroIntro ? 1.0 : 0.0 }
    let isAmbient = hasPlayedHeroIntro

    // GSAP Timeline setup
    const masterTl = gsap.timeline({
      paused: true,
      onComplete: () => {
        hasPlayedHeroIntro = true
        isAmbient = true
        setHeroState(renderer.lite ? 'lite' : 'ambient')
      },
    })

    if (!hasPlayedHeroIntro) {
      // Timeline (about 3.2 - 3.5s total)
      // 0.0s to 2.4s: strokes draw in
      masterTl.to(strokeAnim, {
        progress: 1.0,
        duration: 2.4,
        ease: 'power2.out',
      }, 0.1)

      // 1.8s: wordmark fades in with letter-spacing settling to --tracking-wordmark (0.32em)
      masterTl.to(theRef.current, {
        opacity: 1,
        y: 0,
        letterSpacing: 'clamp(0.25em, 0.2em + 0.3vw, 0.4em)',
        duration: 0.8,
        ease: 'power2.out',
      }, 1.7)

      masterTl.to(atelierRef.current, {
        opacity: 1,
        y: 0,
        letterSpacing: '0.32em',
        duration: 0.9,
        ease: 'power2.out',
      }, 1.8)

      masterTl.to(bySkWrapperRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power2.out',
      }, 2.0)

      masterTl.to([ruleLeftRef.current, ruleRightRef.current], {
        scaleX: 1,
        duration: 0.7,
        ease: 'power2.out',
      }, 2.1)

      // 2.6s: script tagline "Art lives here" reveals with hairline drawing beneath
      masterTl.to(taglineRef.current, {
        opacity: 1,
        y: 0,
        letterSpacing: '0px',
        duration: 0.8,
        ease: 'power2.out',
      }, 2.5)

      masterTl.to(taglineLineRef.current, {
        scaleX: 1,
        duration: 0.6,
        ease: 'power2.out',
      }, 2.7)

      // 3.2s: quiet "Scroll" cue fades in
      masterTl.to(scrollCueRef.current, {
        opacity: 0.85,
        duration: 0.5,
        ease: 'power2.out',
      }, 3.1)

      masterTl.play()
    } else {
      // Skip intro on returning
      strokeAnim.progress = 1.0
      gsap.set(theRef.current, { opacity: 1, y: 0, letterSpacing: 'clamp(0.25em, 0.2em + 0.3vw, 0.4em)' })
      gsap.set(atelierRef.current, { opacity: 1, y: 0, letterSpacing: '0.32em' })
      gsap.set(bySkWrapperRef.current, { opacity: 1, y: 0 })
      gsap.set([ruleLeftRef.current, ruleRightRef.current], { scaleX: 1 })
      gsap.set(taglineRef.current, { opacity: 1, y: 0, letterSpacing: '0px' })
      gsap.set(taglineLineRef.current, { scaleX: 1 })
      gsap.set(scrollCueRef.current, { opacity: 0.85 })
      setHeroState(renderer.lite ? 'lite' : 'ambient')
    }

    // ScrollTrigger: parallax upward and dim toward next section
    const scrollTrigger = ScrollTrigger.create({
      trigger: container,
      start: 'top top',
      end: 'bottom top',
      scrub: true,
      onUpdate: (self) => {
        const p = self.progress
        // Hide scroll cue on any scroll
        if (scrollCueRef.current) {
          scrollCueRef.current.dataset.hidden = p > 0.05 ? 'true' : 'false'
        }
        // Parallax canvas upward slower than page
        if (canvas) {
          gsap.set(canvas, { y: p * 150 })
        }
        // Fade dim
        if (container) {
          gsap.set(container, { opacity: Math.max(0, 1 - p * 0.95) })
        }
      },
    })

    // GSAP Ticker render loop
    const onTick = () => {
      const now = performance.now()
      const dt = Math.min(0.1, (now - lastTime) / 1000)
      const frameDuration = now - lastTime
      lastTime = now

      // Check pause
      if (document.hidden || isPausedRef.current) {
        return
      }

      // Auto-downgrade monitor
      if (!isLite && qualityOverride !== 'full' && !autoDowngraded && isAmbient) {
        frameTimes.push(frameDuration)
        if (frameTimes.length > 120) {
          // ~2 seconds
          const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length
          if (avg > 24) {
            autoDowngraded = true
            isLite = true
            renderer.setLite(true)
            setHeroState('lite')
          }
          frameTimes = []
        }
      }

      renderer.render(strokeAnim.progress, isAmbient, dt)
    }

    gsap.ticker.add(onTick)

    return () => {
      gsap.ticker.remove(onTick)
      masterTl.kill()
      scrollTrigger.kill()
      ro.disconnect()
      io.disconnect()
      window.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearTimeout(resizeTimer)
    }
  }, [
    containerRef,
    canvasRef,
    theRef,
    atelierRef,
    bySkWrapperRef,
    ruleLeftRef,
    ruleRightRef,
    taglineRef,
    taglineLineRef,
    scrollCueRef,
  ])

  return { heroState }
}
