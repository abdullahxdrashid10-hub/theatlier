import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { useHeroAnimation } from './useHeroAnimation'
import '../../styles/hero.css'

export default function Hero() {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const overlayCanvasRef = useRef(null)
  const artImgRef = useRef(null)
  const titleRef = useRef(null)
  const ctaRef = useRef(null)
  const scrollCueRef = useRef(null)

  const { heroState } = useHeroAnimation({
    containerRef,
    canvasRef,
    overlayCanvasRef,
    artImgRef,
    titleRef,
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
      {/* Fallback image: stays visible until WebGL texture is ready */}
      <div className="hero__art-container" aria-hidden="true">
        <img
          ref={artImgRef}
          src="/hero-impasto.jpg"
          alt=""
          className="hero__art-img"
          fetchPriority="high"
        />
      </div>

      {/* Raw WebGL Museum Spotlight & Parallax Shader Canvas */}
      <canvas
        ref={canvasRef}
        className="hero__canvas"
        aria-hidden="true"
      />

      {/* Lightweight 2D Overlay Canvas for Fine-Pointer Dust Trail & Loupe */}
      <canvas
        ref={overlayCanvasRef}
        className="hero__overlay-canvas"
        aria-hidden="true"
      />

      {/* Dark warm radial scrim for pristine text contrast */}
      <div className="hero__scrim" aria-hidden="true" />

      {/* Luxury Editorial Typography: Only Headline, Button, and Scroll Cue */}
      <div className="hero__content">
        <h1
          ref={titleRef}
          className="hero__title"
          data-no-loupe="true"
        >
          <span className="sr-only">The Atelier by SK — </span>
          <span className="hero__heading">Art lives here.</span>
        </h1>

        <div
          ref={ctaRef}
          className="hero__cta-wrapper"
          data-no-loupe="true"
        >
          <Link
            to="/shop"
            className="hero__cta btn btn--framed"
            aria-label="Explore the collection"
            data-no-loupe="true"
          >
            <span>Explore the collection</span>
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
        aria-label="Scroll to discover"
        data-no-loupe="true"
      >
        <span className="hero__scroll-label">Scroll to discover</span>
        <div className="hero__scroll-indicator" aria-hidden="true">
          <span className="hero__scroll-line" />
        </div>
      </button>
    </section>
  )
}
