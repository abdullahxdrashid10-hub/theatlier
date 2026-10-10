import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { PaintHeroRenderer } from './renderer'

gsap.registerPlugin(ScrollTrigger)

// Module-level flag: if true, subsequent page visits skip the intro reveal
let hasPlayedHeroIntro = false

export function resetHeroPlayedFlag() {
  hasPlayedHeroIntro = false
}

export function useHeroAnimation({
  containerRef,
  canvasRef,
  artImgRef,
  eyebrowRef,
  titleRef,
  subheadingRef,
  ctaRef,
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
    if ((navigator.hardwareConcurrency || 4) <= 2 || window.innerWidth < 768) {
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

    // 1. Quality & reduced motion detection
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
      const isSmallScreen = window.innerWidth < 768
      if (hwConc <= 2 || isSmallScreen) {
        isLite = true
      }
    }

    let renderer
    try {
      renderer = new PaintHeroRenderer(canvas, { lite: isLite, reduced: isReducedMotion })
      rendererRef.current = renderer
      if (typeof window !== 'undefined') {
        window.__heroRenderer = renderer
      }
    } catch (e) {
      console.warn('Canvas 2D failed to initialize, relying on fallback:', e)
      return
    }

    // 2. Initial canvas sizing
    const rect = container.getBoundingClientRect()
    renderer.resize(rect.width, rect.height, true)

    if (isReducedMotion) {
      renderer.drawReducedMotion()
      if (artImgRef.current) gsap.set(artImgRef.current, { opacity: 1, scale: 1 })
      if (eyebrowRef.current) gsap.set(eyebrowRef.current, { opacity: 1, y: 0 })
      if (titleRef.current) gsap.set(titleRef.current, { opacity: 1, y: 0 })
      if (subheadingRef.current) gsap.set(subheadingRef.current, { opacity: 1, y: 0 })
      if (ctaRef.current) gsap.set(ctaRef.current, { opacity: 1, y: 0 })
      if (scrollCueRef.current) gsap.set(scrollCueRef.current, { opacity: 0.85, y: 0 })

      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect
          if (width > 0 && height > 0) {
            renderer.resize(width, height)
            renderer.drawReducedMotion()
          }
        }
      })
      ro.observe(container)
      return () => {
        ro.disconnect()
      }
    }

    // 3. Responsive ResizeObserver
    let resizeTimer = null
    const ro = new ResizeObserver((entries) => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect
          if (width > 0 && height > 0) {
            renderer.resize(width, height)
            if (stateRef.current === 'ambient') {
              renderer.render(1.0, true, 0)
            }
          }
        }
      }, 100)
    })
    ro.observe(container)

    // 4. Subtle mouse-guided spotlight tracking (desktop fine pointer only)
    const isFinePointer = window.matchMedia('(pointer: fine)').matches
    const handlePointerMove = (e) => {
      if (!isFinePointer) return
      const cRect = container.getBoundingClientRect()
      const nx = (e.clientX - cRect.left) / cRect.width
      const ny = (e.clientY - cRect.top) / cRect.height
      renderer.setPointer(Math.min(1, Math.max(0, nx)), Math.min(1, Math.max(0, ny)))
    }
    window.addEventListener('pointermove', handlePointerMove, { passive: true })

    // 5. Visibility and intersection handling
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

    // 6. GSAP Timeline Reveal
    const animState = { progress: hasPlayedHeroIntro ? 1.0 : 0.0 }
    let isAmbient = hasPlayedHeroIntro

    const masterTl = gsap.timeline({
      paused: true,
      onComplete: () => {
        hasPlayedHeroIntro = true
        isAmbient = true
        setHeroState(renderer.lite ? 'lite' : 'ambient')
      },
    })

    if (!hasPlayedHeroIntro) {
      // Artwork & Museum Spotlight fade-up
      masterTl.to(
        animState,
        {
          progress: 1.0,
          duration: 1.8,
          ease: 'power2.out',
        },
        0.05
      )

      if (artImgRef.current) {
        masterTl.fromTo(
          artImgRef.current,
          { opacity: 0, scale: 1.05 },
          { opacity: 1, scale: 1, duration: 1.8, ease: 'power2.out' },
          0.05
        )
      }

      // Staggered luxury editorial text entrance
      if (eyebrowRef.current) {
        masterTl.fromTo(
          eyebrowRef.current,
          { opacity: 0, y: -8 },
          { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' },
          0.35
        )
      }

      if (titleRef.current) {
        masterTl.fromTo(
          titleRef.current,
          { opacity: 0, y: 18 },
          { opacity: 1, y: 0, duration: 0.85, ease: 'power3.out' },
          0.60
        )
      }

      if (subheadingRef.current) {
        masterTl.fromTo(
          subheadingRef.current,
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.75, ease: 'power2.out' },
          0.90
        )
      }

      if (ctaRef.current) {
        masterTl.fromTo(
          ctaRef.current,
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.75, ease: 'power2.out' },
          1.20
        )
      }

      if (scrollCueRef.current) {
        masterTl.fromTo(
          scrollCueRef.current,
          { opacity: 0 },
          { opacity: 0.85, duration: 0.6, ease: 'power2.out' },
          1.55
        )
      }

      masterTl.play()
    } else {
      animState.progress = 1.0
      if (artImgRef.current) gsap.set(artImgRef.current, { opacity: 1, scale: 1 })
      if (eyebrowRef.current) gsap.set(eyebrowRef.current, { opacity: 1, y: 0 })
      if (titleRef.current) gsap.set(titleRef.current, { opacity: 1, y: 0 })
      if (subheadingRef.current) gsap.set(subheadingRef.current, { opacity: 1, y: 0 })
      if (ctaRef.current) gsap.set(ctaRef.current, { opacity: 1, y: 0 })
      if (scrollCueRef.current) gsap.set(scrollCueRef.current, { opacity: 0.85, y: 0 })
    }

    // 7. Scroll parallax & cue fading
    const scrollTrigger = ScrollTrigger.create({
      trigger: container,
      start: 'top top',
      end: 'bottom top',
      scrub: true,
      onUpdate: (self) => {
        const p = self.progress
        if (scrollCueRef.current) {
          scrollCueRef.current.dataset.hidden = p > 0.04 ? 'true' : 'false'
        }
        if (artImgRef.current) {
          gsap.set(artImgRef.current, { y: p * 80 })
        }
        if (canvas) {
          gsap.set(canvas, { y: p * 80 })
        }
        if (container) {
          gsap.set(container, { opacity: Math.max(0, 1 - p * 0.95) })
        }
      },
    })

    // 8. Animation Ticker Render Loop
    let lastTime = performance.now()
    const onTick = () => {
      const now = performance.now()
      const dt = Math.min(0.1, (now - lastTime) / 1000)
      lastTime = now

      if (document.hidden || isPausedRef.current) {
        return
      }

      renderer.render(animState.progress, isAmbient, dt)
    }

    gsap.ticker.add(onTick)
    if (typeof window !== 'undefined') {
      window.__heroMountedTime = performance.now()
    }

    return () => {
      gsap.ticker.remove(onTick)
      masterTl.kill()
      scrollTrigger.kill()
      ro.disconnect()
      io.disconnect()
      window.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (renderer && typeof renderer.destroy === 'function') {
        renderer.destroy()
      }
    }
  }, [
    containerRef,
    canvasRef,
    artImgRef,
    eyebrowRef,
    titleRef,
    subheadingRef,
    ctaRef,
    scrollCueRef,
  ])

  return { heroState }
}
