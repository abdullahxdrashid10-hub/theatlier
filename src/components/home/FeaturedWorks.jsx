import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { getFeaturedPaintings } from '../../data/api'
import PaintingCard from '../PaintingCard'
import '../../styles/featured-works.css'

gsap.registerPlugin(ScrollTrigger)

export default function FeaturedWorks() {
  const [paintings, setPaintings] = useState([])
  const sectionRef = useRef(null)
  const headerRef = useRef(null)
  const footerRef = useRef(null)
  const cardsRef = useRef([])

  useEffect(() => {
    let active = true
    getFeaturedPaintings().then((data) => {
      if (active) {
        setPaintings(data.slice(0, 4))
      }
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (paintings.length === 0) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    const ctx = gsap.context(() => {
      // Header reveal
      if (headerRef.current) {
        gsap.from(headerRef.current, {
          y: 24,
          opacity: 0,
          duration: 0.7,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: headerRef.current,
            start: 'top 88%',
            once: true,
          },
        })
      }

      // Staggered card reveals
      cardsRef.current.forEach((el, index) => {
        if (!el) return
        gsap.from(el, {
          y: 24,
          opacity: 0,
          duration: 0.7,
          delay: (index % 2) * 0.15,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            once: true,
          },
        })
      })

      // Footer CTA reveal
      if (footerRef.current) {
        gsap.from(footerRef.current, {
          y: 20,
          opacity: 0,
          duration: 0.7,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: footerRef.current,
            start: 'top 92%',
            once: true,
          },
        })
      }
    }, sectionRef)

    return () => {
      ctx.revert()
    }
  }, [paintings])

  const [p0, p1, p2, p3] = paintings

  return (
    <section ref={sectionRef} className="featured-works" aria-labelledby="featured-works-title">
      <div className="featured-works__inner">
        <header ref={headerRef} className="featured-works__header">
          <span className="featured-works__eyebrow">Curated Selection</span>
          <h2 id="featured-works-title" className="featured-works__title">
            Featured Works
          </h2>
          <div className="featured-works__hairline" aria-hidden="true" />
        </header>

        {paintings.length > 0 && (
          <div className="featured-works__grid">
            {/* Row 1: Large left (p0), Smaller right (p1) */}
            <div className="featured-works__row featured-works__row--1">
              {p0 && (
                <div
                  ref={(el) => (cardsRef.current[0] = el)}
                  className="featured-works__col featured-works__col--left"
                >
                  <PaintingCard painting={p0} variant="editorial" />
                </div>
              )}
              {p1 && (
                <div
                  ref={(el) => (cardsRef.current[1] = el)}
                  className="featured-works__col featured-works__col--right"
                >
                  <PaintingCard painting={p1} />
                </div>
              )}
            </div>

            {/* Row 2: Smaller left (p2), Large right (p3) - alternating! */}
            <div className="featured-works__row featured-works__row--2">
              {p2 && (
                <div
                  ref={(el) => (cardsRef.current[2] = el)}
                  className="featured-works__col featured-works__col--left"
                >
                  <PaintingCard painting={p2} />
                </div>
              )}
              {p3 && (
                <div
                  ref={(el) => (cardsRef.current[3] = el)}
                  className="featured-works__col featured-works__col--right"
                >
                  <PaintingCard painting={p3} variant="editorial" />
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={footerRef} className="featured-works__footer">
          <Link to="/shop" className="btn btn--framed">
            <span>View all works</span>
            <span className="btn__arrow" aria-hidden="true">
              &rarr;
            </span>
          </Link>
        </div>
      </div>
    </section>
  )
}
