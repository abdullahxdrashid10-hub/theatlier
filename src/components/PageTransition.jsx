import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { gsap } from 'gsap'
import '../styles/transitions.css'

export default function PageTransition({ children }) {
  const location = useLocation()
  const contentRef = useRef(null)
  const beamRef = useRef(null)
  const isFirstRender = useRef(true)

  useEffect(() => {
    // Skip elaborate transition on initial mount so first-load isn't delayed
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    const tl = gsap.timeline()

    // 1. Top gold beam sweep
    if (beamRef.current) {
      tl.fromTo(
        beamRef.current,
        { scaleX: 0, opacity: 1 },
        { scaleX: 1, duration: 0.42, ease: 'power3.inOut' },
      ).to(
        beamRef.current,
        { opacity: 0, duration: 0.22, ease: 'power1.out' },
        '-=0.08',
      )
    }

    // 2. Incoming page content sequenced fade-up
    if (contentRef.current) {
      tl.fromTo(
        contentRef.current,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out' },
        0.08,
      )
    }

    return () => {
      tl.kill()
    }
  }, [location.pathname])

  return (
    <>
      <div
        ref={beamRef}
        className="page-transition-beam"
        aria-hidden="true"
        style={{ transform: 'scaleX(0)', opacity: 0 }}
      />
      <div ref={contentRef} className="page-transition-wrapper">
        {children}
      </div>
    </>
  )
}
