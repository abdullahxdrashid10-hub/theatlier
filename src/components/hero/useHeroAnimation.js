import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { WebGLHeroRenderer } from './webglRenderer'
import { OverlayEffectsManager } from './overlayEffects'
import { heroEffects } from '../../config/heroEffects'

gsap.registerPlugin(ScrollTrigger)

let hasPlayedHeroIntro = false

export function resetHeroPlayedFlag() {
  hasPlayedHeroIntro = false
}

export function useHeroAnimation({
  containerRef,
  canvasRef,
  overlayCanvasRef,
  artImgRef,
  titleRef,
  ctaRef,
  scrollCueRef,
}) {
  const [heroState, setHeroState] = useState(() => {
    if (typeof window === 'undefined') return 'intro'
    const sp = new URLSearchParams(window.location.search)
    const isMotionFull = sp.get('motion') === 'full'
    if (isMotionFull) return 'intro'
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'fallback'
    if (navigator.connection?.saveData === true) return 'fallback'
    return hasPlayedHeroIntro ? 'live' : 'intro'
  })
  const webglRef = useRef(null)
  const overlayRef = useRef(null)
  const isPausedRef = useRef(false)

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    const overlayCanvas = overlayCanvasRef.current
    if (!container || !canvas) return

    // Dev override & fallback checks
    const sp = new URLSearchParams(window.location.search)
    const isMotionFull = sp.get('motion') === 'full'
    const isReducedMotion = !isMotionFull && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const isSaveData = !isMotionFull && (navigator.connection?.saveData === true)

    // Fallback directly to plain image if reduced-motion or save-data
    if (isReducedMotion || isSaveData) {
      if (artImgRef.current) gsap.set(artImgRef.current, { opacity: 1, scale: 1 })
      if (titleRef.current) gsap.set(titleRef.current, { opacity: 1, y: 0 })
      if (ctaRef.current) gsap.set(ctaRef.current, { opacity: 1, y: 0 })
      if (scrollCueRef.current) gsap.set(scrollCueRef.current, { opacity: 0.85, y: 0 })
      return
    }

    // Initialize WebGL
    let renderer
    try {
      renderer = new WebGLHeroRenderer(canvas)
      if (!renderer.gl) throw new Error('WebGL not available')
      webglRef.current = renderer
    } catch {
      // Fallback on WebGL failure
      setHeroState('fallback')
      if (artImgRef.current) gsap.set(artImgRef.current, { opacity: 1, scale: 1 })
      if (titleRef.current) gsap.set(titleRef.current, { opacity: 1, y: 0 })
      if (ctaRef.current) gsap.set(ctaRef.current, { opacity: 1, y: 0 })
      if (scrollCueRef.current) gsap.set(scrollCueRef.current, { opacity: 0.85, y: 0 })
      return
    }

    // Context loss handler
    const handleContextLost = (e) => {
      e.preventDefault()
      setHeroState('fallback')
      if (artImgRef.current) gsap.set(artImgRef.current, { opacity: 1, scale: 1 })
    }
    canvas.addEventListener('webglcontextlost', handleContextLost, false)

    // Initialize Overlay (dust & loupe) - strictly fine-pointer only
    let overlayManager = null
    const isFinePointer = typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches
    if (overlayCanvas && isFinePointer) {
      overlayManager = new OverlayEffectsManager(overlayCanvas, container, {
        getParallaxOffset: () => {
          if (!renderer || !renderer.activeEffects.parallax) return { x: 0, y: 0 }
          const maxOffset = 14.0 / (renderer.canvas.width || 1440)
          return {
            x: -renderer.parallaxX * maxOffset * 0.5,
            y: -renderer.parallaxY * maxOffset * 0.5,
          }
        },
      })
      overlayRef.current = overlayManager
    }

    // Resize handling
    const updateSize = () => {
      const rect = container.getBoundingClientRect()
      renderer.resize(rect.width, rect.height)
      if (overlayManager) overlayManager.resize(rect.width, rect.height)
    }
    updateSize()

    const ro = new ResizeObserver(() => updateSize())
    ro.observe(container)

    // Pointer events
    const handlePointerMove = (e) => {
      const cRect = container.getBoundingClientRect()
      const nx = Math.min(1, Math.max(0, (e.clientX - cRect.left) / cRect.width))
      const ny = Math.min(1, Math.max(0, (e.clientY - cRect.top) / cRect.height))
      renderer.setPointer(nx, ny)
      if (overlayManager) {
        overlayManager.onPointerMove(e.clientX, e.clientY)
      }
    }
    window.addEventListener('pointermove', handlePointerMove, { passive: true })

    const handleTouchStart = () => {
      renderer.setTouch()
    }
    window.addEventListener('touchstart', handleTouchStart, { passive: true })

    // DeviceOrientation Tilt (Android permission-less only; NO permission prompts on iOS)
    let hasBoundTilt = false
    if (
      heroEffects.tilt &&
      typeof window !== 'undefined' &&
      window.DeviceOrientationEvent &&
      typeof DeviceOrientationEvent.requestPermission !== 'function'
    ) {
      const handleOrientation = (e) => {
        if (e.gamma !== null && e.beta !== null) {
          const tiltX = Math.max(-1, Math.min(1, e.gamma / 45))
          const tiltY = Math.max(-1, Math.min(1, (e.beta - 30) / 30))
          renderer.setTilt(tiltX, tiltY)
        }
      }
      window.addEventListener('deviceorientation', handleOrientation, { passive: true })
      hasBoundTilt = true
    }

    // Visibility & Pause
    const handleVisibility = () => {
      isPausedRef.current = document.hidden
    }
    document.addEventListener('visibilitychange', handleVisibility)

    const io = new IntersectionObserver(([entry]) => {
      isPausedRef.current = !entry.isIntersecting
    }, { threshold: 0.05 })
    io.observe(container)

    // Intro Animation Timeline
    const masterTl = gsap.timeline({
      paused: true,
      onComplete: () => {
        hasPlayedHeroIntro = true
        setHeroState('live')
        // Hide plain fallback image once first WebGL frames render smoothly
        if (artImgRef.current) gsap.set(artImgRef.current, { opacity: 0 })
      },
    })

    if (!hasPlayedHeroIntro) {
      // Headline and Button reveal
      if (titleRef.current) {
        masterTl.fromTo(
          titleRef.current,
          { opacity: 0, y: 22 },
          { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out' },
          0.4
        )
      }

      if (ctaRef.current) {
        masterTl.fromTo(
          ctaRef.current,
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.85, ease: 'power2.out' },
          0.9
        )
      }

      if (scrollCueRef.current) {
        masterTl.fromTo(
          scrollCueRef.current,
          { opacity: 0 },
          { opacity: 0.85, duration: 0.6, ease: 'power2.out' },
          1.3
        )
      }

      masterTl.play()
    } else {
      if (titleRef.current) gsap.set(titleRef.current, { opacity: 1, y: 0 })
      if (ctaRef.current) gsap.set(ctaRef.current, { opacity: 1, y: 0 })
      if (scrollCueRef.current) gsap.set(scrollCueRef.current, { opacity: 0.85, y: 0 })
      if (artImgRef.current) gsap.set(artImgRef.current, { opacity: 0 })
    }

    // Scroll parallax & cue fading
    const scrollTrigger = ScrollTrigger.create({
      trigger: container,
      start: 'top top',
      end: 'bottom top',
      scrub: true,
      onUpdate: (self) => {
        const p = self.progress
        if (scrollCueRef.current) {
          scrollCueRef.current.dataset.hidden = p > 0.03 ? 'true' : 'false'
        }
        if (canvas) gsap.set(canvas, { y: p * 60 })
        if (overlayCanvas) gsap.set(overlayCanvas, { y: p * 60 })
      },
    })

    // Animation Ticker
    let lastTime = performance.now()
    const onTick = () => {
      const now = performance.now()
      const dt = Math.min(0.1, (now - lastTime) / 1000)
      lastTime = now

      if (isPausedRef.current) return

      renderer.render(dt)
      if (overlayManager) overlayManager.updateAndDraw(dt)

      // Fade out plain fallback once WebGL is loaded and rendering
      if (renderer.textureLoaded && artImgRef.current && artImgRef.current.style.opacity !== '0') {
        gsap.to(artImgRef.current, { opacity: 0, duration: 0.4 })
      }
    }

    gsap.ticker.add(onTick)

    return () => {
      gsap.ticker.remove(onTick)
      masterTl.kill()
      scrollTrigger.kill()
      ro.disconnect()
      io.disconnect()
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('visibilitychange', handleVisibility)
      canvas.removeEventListener('webglcontextlost', handleContextLost)
      if (hasBoundTilt) {
        window.removeEventListener('deviceorientation', () => {})
      }
      renderer.destroy()
      if (overlayManager) overlayManager.destroy()
    }
  }, [
    containerRef,
    canvasRef,
    overlayCanvasRef,
    artImgRef,
    titleRef,
    ctaRef,
    scrollCueRef,
  ])

  return { heroState }
}
