import { useRef } from 'react'
import { useHeroAnimation } from './useHeroAnimation'
import '../../styles/hero.css'

export default function Hero() {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const theRef = useRef(null)
  const atelierRef = useRef(null)
  const bySkWrapperRef = useRef(null)
  const ruleLeftRef = useRef(null)
  const ruleRightRef = useRef(null)
  const taglineRef = useRef(null)
  const taglineLineRef = useRef(null)
  const scrollCueRef = useRef(null)

  const { heroState } = useHeroAnimation({
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
  })

  return (
    <section
      ref={containerRef}
      className="hero"
      data-hero-state={heroState}
      aria-label="Welcome to The Atelier by SK"
    >
      <canvas
        ref={canvasRef}
        className="hero__canvas"
        aria-hidden="true"
      />

      <div className="hero__scrim" aria-hidden="true" />

      <div className="hero__content">
        <h1 className="hero__title">
          <span ref={theRef} className="hero__word-the">
            THE
          </span>
          <span ref={atelierRef} className="hero__word-atelier">
            ATELIER
          </span>
          <div ref={bySkWrapperRef} className="hero__by-sk-wrapper">
            <span ref={ruleLeftRef} className="hero__rule hero__rule--left" />
            <span className="hero__word-by-sk">BY SK</span>
            <span ref={ruleRightRef} className="hero__rule hero__rule--right" />
          </div>
        </h1>

        <div className="hero__tagline-wrapper">
          <p ref={taglineRef} className="hero__tagline">
            Art lives here
          </p>
          <div ref={taglineLineRef} className="hero__tagline-line" aria-hidden="true" />
        </div>
      </div>

      <div ref={scrollCueRef} className="hero__scroll-cue" aria-hidden="true">
        <span>Scroll</span>
        <div className="hero__scroll-indicator" />
      </div>
    </section>
  )
}
