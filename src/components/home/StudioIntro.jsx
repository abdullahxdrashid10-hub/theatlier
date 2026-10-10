import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import '../../styles/studio-intro.css'

gsap.registerPlugin(ScrollTrigger)

export default function StudioIntro() {
  const sectionRef = useRef(null)
  const innerRef = useRef(null)

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    const ctx = gsap.context(() => {
      if (innerRef.current) {
        gsap.from(innerRef.current.children, {
          y: 24,
          opacity: 0,
          duration: 0.75,
          stagger: 0.14,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 82%',
            once: true,
          },
        })
      }
    }, sectionRef)

    return () => {
      ctx.revert()
    }
  }, [])

  return (
    <section ref={sectionRef} className="studio-intro" aria-labelledby="studio-intro-heading">
      <div ref={innerRef} className="studio-intro__inner">
        <span className="studio-intro__eyebrow">The Studio · Atelier by SK</span>

        <h2 id="studio-intro-heading" className="studio-intro__quote">
          “Paint is not an illusion of light. It is light captured in <em>physical</em> relief.”
        </h2>

        <div className="studio-intro__hairline" aria-hidden="true" />

        <p className="studio-intro__body">
          Every work at The Atelier is sculpted with the palette knife on Belgian linen. Rich
          metallic pigments, burnt umber, and charcoal are applied with intention—creating
          tactile crests and ridges that catch the shifting daylight of your room.
          No reproductions. No editions. Each piece is singular and one of one.
        </p>

        <div className="studio-intro__actions">
          <Link to="/shop" className="studio-intro__link-primary">
            <span>Explore the collection</span>
            <span aria-hidden="true">&rarr;</span>
          </Link>
          <Link to="/about" className="studio-intro__link-secondary">
            <span>The artist’s journey &rarr;</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
