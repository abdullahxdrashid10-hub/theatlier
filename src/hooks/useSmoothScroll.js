import { useEffect } from 'react'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { setLenis } from '../utils/scroll'

gsap.registerPlugin(ScrollTrigger)

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

/**
 * Lenis smooth scroll driven by GSAP's ticker so ScrollTrigger stays in sync.
 * Disabled entirely while the user prefers reduced motion (and reacts live if
 * that preference changes).
 */
export default function useSmoothScroll() {
  useEffect(() => {
    const mql = window.matchMedia(REDUCED_MOTION)
    let lenis = null
    let tick = null

    const start = () => {
      if (lenis) return
      lenis = new Lenis({ autoRaf: false })
      setLenis(lenis)
      lenis.on('scroll', ScrollTrigger.update)
      tick = (time) => lenis.raf(time * 1000)
      gsap.ticker.add(tick)
      gsap.ticker.lagSmoothing(0)
    }

    const stop = () => {
      if (!lenis) return
      gsap.ticker.remove(tick)
      lenis.destroy()
      lenis = null
      tick = null
      setLenis(null)
    }

    const sync = () => (mql.matches ? stop() : start())
    sync()
    mql.addEventListener('change', sync)

    return () => {
      mql.removeEventListener('change', sync)
      stop()
    }
  }, [])
}
