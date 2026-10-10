import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { useHeroAnimation } from './useHeroAnimation'
import '../../styles/hero.css'

export default function Hero() {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const artImgRef = useRef(null)
  const eyebrowRef = useRef(null)
  const titleRef = useRef(null)
  const subheadingRef = useRef(null)
  const ctaRef = useRef(null)
  const scrollCueRef = useRef(null)

  const { heroState } = useHeroAnimation({
    containerRef,
    canvasRef,
    artImgRef,
    eyebrowRef,
    titleRef,
    subheadingRef,
    ctaRef,
    scrollCueRef,
  })

  const handleScrollToDiscover = () => {
    const nextSection = document.querySelector('.featured-works') || document.querySelector('#featured-works')
    if (nextSection) {
      nextSection.scrollIntoView({ behavior: 'smooth' })
    } else {
      window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })
    }
  }

  return (
    <section
      ref={containerRef}
      className="hero"
      data-hero-state={heroState}
      aria-label="The Atelier by SK — Art lives here"
    >
      {/* Background artwork: Authentic impasto palette-knife oil painting */}
      <div className="hero__art-container" aria-hidden="true">
        <img
          ref={artImgRef}
          src="/hero-impasto.jpg"
          alt=""
          className="hero__art-img"
          fetchPriority="high"
        />
      </div>

      {/* Interactive Cinematic Museum Lighting & Specular Sheen Canvas */}
      <canvas
        ref={canvasRef}
        className="hero__canvas"
        aria-hidden="true"
      />

      {/* Dark warm radial scrim for pristine text contrast */}
      <div className="hero__scrim" aria-hidden="true" />

      {/* Luxury Editorial Typography Lockup */}
      <div className="hero__content">
        <div ref={eyebrowRef} className="hero__eyebrow">
          EXHIBITION I — 2026 COLLECTION
        </div>

        <h1 ref={titleRef} className="hero__title">
          <span className="sr-only">The Atelier by SK — </span>
          <span className="hero__heading">Art lives here.</span>
        </h1>

        <p ref={subheadingRef} className="hero__subheading">
          Original works. Unrepeatable expressions.
        </p>

        <div ref={ctaRef} className="hero__cta-wrapper">
          <Link
            to="/shop"
            className="hero__cta btn btn--framed"
            aria-label="Explore the collection"
          >
            <span>EXPLORE THE COLLECTION</span>
            <span className="btn__arrow" aria-hidden="true">→</span>
          </Link>
        </div>
      </div>

      {/* Minimal Refined Scroll Indicator */}
      <button
        ref={scrollCueRef}
        type="button"
        className="hero__scroll-cue"
        onClick={handleScrollToDiscover}
        aria-label="Scroll to discover collection"
      >
        <span className="hero__scroll-label">SCROLL TO DISCOVER</span>
        <div className="hero__scroll-indicator" aria-hidden="true">
          <span className="hero__scroll-line" />
        </div>
      </button>
    </section>
  )
}
