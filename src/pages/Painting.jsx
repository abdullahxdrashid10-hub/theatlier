import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { gsap } from 'gsap'
import { getAllPaintings, getPaintingBySlug } from '../data/api'
import PaintingCard from '../components/PaintingCard'
import { addToCart, isInCart, subscribeToCart } from '../utils/cartStorage'
import { formatPKR } from '../utils/formatPKR'
import { lockScroll } from '../utils/scroll'
import '../styles/painting-detail.css'

// Exquisite photographic mockups for featured artworks
const HIGH_RES_MOCKS = {
  'placeholder-ember-field': '/placeholders/mock-ember-field.jpg',
  'placeholder-bronze-hour': '/placeholders/mock-bronze-hour.jpg',
  'placeholder-gilded-wake': '/placeholders/mock-gilded-wake.jpg',
}

function ZoomIcon() {
  return (
    <svg className="painting-detail__zoom-icon" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="11" y1="8" x2="11" y2="14" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  )
}

export default function Painting() {
  const { slug } = useParams()
  const navigate = useNavigate()

  const [painting, setPainting] = useState(null)
  const [relatedPaintings, setRelatedPaintings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Active view / image thumbnail index
  const [activeViewIndex, setActiveViewIndex] = useState(0)
  const [isSwitchingView, setIsSwitchingView] = useState(false)

  // Desktop hover zoom state
  const [isZooming, setIsZooming] = useState(false)
  const viewportRef = useRef(null)
  const zoomLayerRef = useRef(null)
  const pageRef = useRef(null)

  // Fullscreen Inspection Modal (Mobile & Desktop)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxZoomed, setLightboxZoomed] = useState(false)

  // Cart state
  const [inCart, setInCart] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)

  const [prevSlug, setPrevSlug] = useState(slug)
  if (prevSlug !== slug) {
    setPrevSlug(slug)
    setLoading(true)
    setError(null)
    setActiveViewIndex(0)
    setIsZooming(false)
  }

  // Fetch painting by slug and related works
  useEffect(() => {
    let active = true

    Promise.all([getPaintingBySlug(slug), getAllPaintings()])
      .then(([item, allItems]) => {
        if (!active) return
        if (!item) {
          setPainting(null)
          setLoading(false)
          return
        }

        setPainting(item)
        setInCart(isInCart(item.id))

        // Curate 3 other paintings
        const others = allItems
          .filter((p) => p.slug !== slug)
          .sort((a, b) => (a.status === 'available' ? 0 : 1) - (b.status === 'available' ? 0 : 1))
          .slice(0, 3)
        setRelatedPaintings(others)
        setLoading(false)
      })
      .catch((err) => {
        if (!active) return
        setError(err.message || 'Unable to retrieve artwork records.')
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [slug])

  // GSAP Entrance Reveal Animation
  useEffect(() => {
    if (loading || !painting) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    const ctx = gsap.context(() => {
      gsap.from('.painting-detail__gallery', {
        opacity: 0,
        y: 20,
        duration: 0.75,
        ease: 'power2.out',
      })

      gsap.from(
        [
          '.painting-detail__breadcrumbs',
          '.painting-detail__header-top',
          '.painting-detail__title',
          '.painting-detail__price-row',
          '.painting-detail__specs-grid',
          '.painting-detail__action-box',
          '.painting-detail__accordions',
        ],
        {
          opacity: 0,
          y: 16,
          duration: 0.65,
          stagger: 0.05,
          ease: 'power2.out',
          delay: 0.08,
        },
      )
    }, pageRef)

    return () => {
      ctx.revert()
    }
  }, [loading, painting])

  // Sync cart status on storage changes
  useEffect(() => {
    if (!painting) return
    const unsubscribe = subscribeToCart(() => {
      setInCart(isInCart(painting.id))
    })
    return unsubscribe
  }, [painting])

  // Build the array of image views for this painting (Stacked / Grid view, never slider)
  const views = useMemo(() => {
    if (!painting) return []
    const list = []

    const highResMock = HIGH_RES_MOCKS[painting.slug]
    if (highResMock) {
      list.push({
        url: highResMock,
        label: 'Impasto Canvas',
        description: 'Exhibition photographic studio view with natural gallery lighting',
      })
    }

    if (painting.images && painting.images.length > 0) {
      list.push({
        url: painting.images[0],
        label: highResMock ? 'Full Composition' : 'Main Composition',
        description: 'Full canvas front elevation',
      })
      if (painting.images[1]) {
        list.push({
          url: painting.images[1],
          label: 'Surface Detail',
          description: 'High-magnification palette-knife relief & brushwork study',
        })
      }
    }

    return list
  }, [painting])

  const activeImage = views[activeViewIndex]?.url || painting?.images?.[0] || '/placeholders/placeholder-01.svg'

  const handleSelectView = (index) => {
    if (index === activeViewIndex) return
    setIsSwitchingView(true)
    setTimeout(() => {
      setActiveViewIndex(index)
      setIsSwitchingView(false)
    }, 110)
  }

  // Desktop Pointer Move Zoom Handler
  const handlePointerMove = useCallback((e) => {
    const el = viewportRef.current
    const layer = zoomLayerRef.current
    if (!el || !layer) return

    const rect = el.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))

    layer.style.transformOrigin = `${(x * 100).toFixed(2)}% ${(y * 100).toFixed(2)}%`
  }, [])

  const handlePointerEnter = useCallback(() => {
    // Only engage fine hover zoom if device has a mouse/fine pointer
    if (window.matchMedia('(pointer: fine)').matches) {
      setIsZooming(true)
    }
  }, [])

  const handlePointerLeave = useCallback(() => {
    setIsZooming(false)
  }, [])

  // Lightbox toggle
  const openLightbox = useCallback(() => {
    setLightboxOpen(true)
    setLightboxZoomed(false)
    lockScroll(true)
  }, [])

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false)
    setLightboxZoomed(false)
    lockScroll(false)
  }, [])

  // Close lightbox on Escape key
  useEffect(() => {
    if (!lightboxOpen) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') closeLightbox()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [lightboxOpen, closeLightbox])

  // Clean up lockScroll on unmount
  useEffect(() => {
    return () => lockScroll(false)
  }, [])

  // Handle Acquire Artwork CTA
  const handleAcquire = () => {
    if (!painting) return

    // Strictly enforce: Sold works cannot be added to the cart
    if (painting.status === 'sold') {
      return
    }

    const result = addToCart(painting)
    if (result.success) {
      setInCart(true)
      setToastMessage('Artwork added to your acquisition list.')
    } else if (result.reason === 'duplicate') {
      setToastMessage('This piece is already in your acquisition list.')
    }
  }

  // Loading State
  if (loading) {
    return (
      <main className="painting-detail">
        <title>Loading Artwork — The Atelier by SK</title>
        <div className="painting-detail__loading" role="status" aria-live="polite">
          <div className="painting-detail__spinner" aria-hidden="true" />
          <p>Accessing the studio archives...</p>
        </div>
      </main>
    )
  }

  // Error / Not Found State
  if (error || !painting) {
    return (
      <main className="painting-detail">
        <title>Artwork Not Found — The Atelier by SK</title>
        <div className="painting-detail__error" role="alert">
          <h1 className="painting-detail__error-title">Artwork Not Located</h1>
          <p>This original piece may have moved in the catalog or is currently unlisted.</p>
          <Link to="/shop" className="btn btn--gilded">
            Explore The Collection <span className="btn__arrow">→</span>
          </Link>
        </div>
      </main>
    )
  }

  const isSold = painting.status === 'sold'
  const aspectRatio = painting.widthCm && painting.heightCm
    ? `${painting.widthCm} / ${painting.heightCm}`
    : '4 / 3'

  // Dimensions in inches conversion for luxury clientele
  const widthInches = (painting.widthCm * 0.393701).toFixed(1)
  const heightInches = (painting.heightCm * 0.393701).toFixed(1)

  return (
    <main ref={pageRef} className="painting-detail">
      <title>{`${painting.title} — The Atelier by SK`}</title>

      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="painting-detail__breadcrumbs">
        <Link to="/" className="painting-detail__breadcrumb-link">Atelier</Link>
        <span className="painting-detail__breadcrumb-sep" aria-hidden="true">/</span>
        <Link to="/shop" className="painting-detail__breadcrumb-link">The Collection</Link>
        <span className="painting-detail__breadcrumb-sep" aria-hidden="true">/</span>
        <span className="painting-detail__breadcrumb-current" aria-current="page">{painting.title}</span>
      </nav>

      <div className="painting-detail__layout">
        {/* ===================================================================
            LEFT COLUMN: Exhibition Frame & High-Resolution Interactive Zoom
            =================================================================== */}
        <section className="painting-detail__gallery" aria-label="Artwork Imagery">
          <div className="painting-detail__frame">
            <div
              ref={viewportRef}
              className="painting-detail__viewport"
              style={{ aspectRatio }}
              data-zooming={isZooming ? 'true' : 'false'}
              onPointerEnter={handlePointerEnter}
              onPointerLeave={handlePointerLeave}
              onPointerMove={handlePointerMove}
              onClick={openLightbox}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') openLightbox()
              }}
              aria-label={`${painting.title}. Interactive high-resolution inspection. Click or tap to view full screen.`}
            >
              {/* Primary Static Base Image */}
              <img
                src={activeImage}
                alt={painting.title}
                className="painting-detail__image"
                style={{ opacity: isSwitchingView ? 0.35 : 1 }}
                width={painting.widthCm * 10}
                height={painting.heightCm * 10}
                loading="eager"
                decoding="sync"
              />

              {/* Magnified Zoom Layer (Desktop Fine Cursor Loupe) */}
              <div
                ref={zoomLayerRef}
                className="painting-detail__zoom-layer"
                style={{
                  backgroundImage: `url("${activeImage}")`,
                }}
                aria-hidden="true"
              />

              {/* Sold Watermark Indicator on Frame */}
              {isSold && (
                <div className="painting-detail__sold-watermark">
                  <span>Acquired · Private Collection</span>
                </div>
              )}

              {/* Floating Zoom / Tap Cue Badge */}
              <div className="painting-detail__zoom-cue" aria-hidden="true">
                <ZoomIcon />
                <span>{isZooming ? 'Magnification 2.5×' : 'Hover to magnify · Tap for full'}</span>
              </div>
            </div>
          </div>

          {/* Fullscreen Inspection Trigger Button for Phones & Assistive Tech */}
          <button
            type="button"
            className="painting-detail__inspect-btn"
            onClick={openLightbox}
            aria-haspopup="dialog"
          >
            <ZoomIcon />
            <span>Examine High-Resolution Texture & Relief</span>
          </button>

          {/* Extra Images: Stacked / Grid View (Strictly no slider) */}
          {views.length > 1 && (
            <div className="painting-detail__thumbs" role="group" aria-label="Available Artwork Perspectives">
              {views.map((view, index) => {
                const isActive = index === activeViewIndex
                return (
                  <button
                    key={view.url}
                    type="button"
                    className={`painting-detail__thumb-btn ${isActive ? 'painting-detail__thumb-btn--active' : ''}`}
                    onClick={() => handleSelectView(index)}
                    aria-label={`View perspective ${index + 1}: ${view.label}`}
                    aria-pressed={isActive}
                  >
                    <div className="painting-detail__thumb-img-wrap">
                      <img
                        src={view.url}
                        alt=""
                        className="painting-detail__thumb-img"
                        loading="lazy"
                        aria-hidden="true"
                      />
                    </div>
                    <span className="painting-detail__thumb-label">{view.label}</span>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        {/* ===================================================================
            RIGHT COLUMN: Editorial Metadata, Availability & Acquisition Flow
            =================================================================== */}
        <section className="painting-detail__info" aria-label="Artwork Information">
          {/* Header & Status Badge */}
          <div className="painting-detail__header-top">
            <span className="painting-detail__eyebrow">Original Artwork · One of One · {painting.year}</span>
            <div
              className={`painting-detail__badge ${isSold ? 'painting-detail__badge--sold' : 'painting-detail__badge--available'}`}
              role="status"
            >
              <span className="painting-detail__badge-dot" aria-hidden="true" />
              <span>{isSold ? 'Acquired · In Private Collection' : 'Available for Acquisition'}</span>
            </div>
          </div>

          {/* Title */}
          <h1 className="painting-detail__title">{painting.title}</h1>

          {/* Price Row */}
          <div className="painting-detail__price-row">
            {isSold ? (
              <>
                <span className="painting-detail__price painting-detail__price--sold">
                  {formatPKR(painting.price)}
                </span>
                <span className="painting-detail__price-note">
                  Acquired · Private Collection
                </span>
              </>
            ) : (
              <>
                <span className="painting-detail__price">
                  {formatPKR(painting.price)}
                </span>
                <span className="painting-detail__price-note">
                  Inclusive of bespoke museum framing & shipping
                </span>
              </>
            )}
          </div>

          {/* Quick Specifications Grid */}
          <div className="painting-detail__specs-grid" aria-label="Artwork Specifications">
            <div className="painting-detail__spec-item">
              <span className="painting-detail__spec-label">Medium</span>
              <span className="painting-detail__spec-value">{painting.medium}</span>
            </div>
            <div className="painting-detail__spec-item">
              <span className="painting-detail__spec-label">Dimensions</span>
              <span className="painting-detail__spec-value">
                {painting.widthCm} × {painting.heightCm} cm ({widthInches} × {heightInches} in)
              </span>
            </div>
            <div className="painting-detail__spec-item">
              <span className="painting-detail__spec-label">Creation Year</span>
              <span className="painting-detail__spec-value">{painting.year}</span>
            </div>
            <div className="painting-detail__spec-item">
              <span className="painting-detail__spec-label">Authenticity</span>
              <span className="painting-detail__spec-value">Signed verso by artist</span>
            </div>
          </div>

          {/* Action Box: Acquisition or Sold Handling */}
          <div className="painting-detail__action-box">
            {isSold ? (
              <>
                {/* Strictly disabled button when artwork is sold */}
                <button
                  type="button"
                  disabled
                  className="btn btn--framed painting-detail__cta painting-detail__cta--sold"
                  aria-disabled="true"
                  title="This artwork has been acquired and cannot be added to the cart"
                >
                  Acquired — In Private Collection
                </button>
                <div className="painting-detail__secondary-actions">
                  <Link
                    to={`/contact?inquiry=commission&title=${encodeURIComponent(painting.title)}`}
                    className="painting-detail__inquire-link"
                  >
                    Commission a similar bespoke piece inspired by this work <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </>
            ) : (
              <>
                {inCart ? (
                  <button
                    type="button"
                    className="btn btn--framed painting-detail__cta painting-detail__cta--incart"
                    onClick={() => navigate('/cart')}
                  >
                    In Your Selection — Proceed to Cart <span className="btn__arrow">→</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn--gilded painting-detail__cta"
                    onClick={handleAcquire}
                  >
                    Acquire Artwork <span className="btn__arrow">→</span>
                  </button>
                )}

                {/* Instant Feedback Toast */}
                {toastMessage && (
                  <div className="painting-detail__cart-toast" role="status" aria-live="polite">
                    <span className="painting-detail__toast-text">{toastMessage}</span>
                    <Link to="/cart" className="painting-detail__toast-link">
                      View Cart →
                    </Link>
                  </div>
                )}

                <div className="painting-detail__secondary-actions">
                  <Link
                    to={`/contact?inquiry=viewing&title=${encodeURIComponent(painting.title)}`}
                    className="painting-detail__inquire-link"
                  >
                    Schedule a private atelier viewing or consultation <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* Editorial Accordions */}
          <div className="painting-detail__accordions" aria-label="Editorial Details">
            <details className="painting-detail__accordion" open>
              <summary className="painting-detail__accordion-summary">
                <span>The Story & Technique</span>
                <span className="painting-detail__accordion-icon" aria-hidden="true">+</span>
              </summary>
              <div className="painting-detail__accordion-wrapper">
                <div className="painting-detail__accordion-inner">
                  <div className="painting-detail__accordion-content">
                    <p>
                      {painting.description.replace('PLACEHOLDER — ', '')}
                    </p>
                    <p>
                      Layered with heavy palette-knife impasto on archival Belgian canvas. The surface features
                      sculptural ridges that capture natural and gallery light differently throughout the day,
                      accentuated by subtle champagne and antique gold mineral pigments.
                    </p>
                  </div>
                </div>
              </div>
            </details>

            <details className="painting-detail__accordion">
              <summary className="painting-detail__accordion-summary">
                <span>Provenance & Certificate of Authenticity</span>
                <span className="painting-detail__accordion-icon" aria-hidden="true">+</span>
              </summary>
              <div className="painting-detail__accordion-wrapper">
                <div className="painting-detail__accordion-inner">
                  <div className="painting-detail__accordion-content">
                    <p>
                      Each original artwork from The Atelier is unique and recorded in the studio registry.
                      Upon acquisition, the collector receives:
                    </p>
                    <ul className="painting-detail__bullet-list">
                      <li className="painting-detail__bullet-item">
                        <span className="painting-detail__bullet-icon">✦</span>
                        <span>An embossed Certificate of Authenticity individually signed and sealed by the artist.</span>
                      </li>
                      <li className="painting-detail__bullet-item">
                        <span className="painting-detail__bullet-icon">✦</span>
                        <span>Archival catalog reference number and provenance transfer dossier.</span>
                      </li>
                      <li className="painting-detail__bullet-item">
                        <span className="painting-detail__bullet-icon">✦</span>
                        <span>Artist signature and dating inscribed verso on the canvas stretcher.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </details>

            <details className="painting-detail__accordion">
              <summary className="painting-detail__accordion-summary">
                <span>White-Glove Shipping & Art Crating</span>
                <span className="painting-detail__accordion-icon" aria-hidden="true">+</span>
              </summary>
              <div className="painting-detail__accordion-wrapper">
                <div className="painting-detail__accordion-inner">
                  <div className="painting-detail__accordion-content">
                    <p>
                      Due to the heavy sculptural impasto surface, this painting is prepared with specialised care:
                    </p>
                    <ul className="painting-detail__bullet-list">
                      <li className="painting-detail__bullet-item">
                        <span className="painting-detail__bullet-icon">✦</span>
                        <span>Encased in an acid-free barrier wrap and custom timber-reinforced exhibition crate.</span>
                      </li>
                      <li className="painting-detail__bullet-item">
                        <span className="painting-detail__bullet-icon">✦</span>
                        <span>Complimentary insured courier delivery across Pakistan (3–5 business days).</span>
                      </li>
                      <li className="painting-detail__bullet-item">
                        <span className="painting-detail__bullet-icon">✦</span>
                        <span>Worldwide temperature-stable fine art freight options available upon inquiry.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </details>
          </div>
        </section>
      </div>

      {/* ===================================================================
          FULLSCREEN HIGH-RES INSPECTION LIGHTBOX (Mobile & Desktop)
          =================================================================== */}
      {lightboxOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="painting-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label={`High-resolution inspection of ${painting.title}`}
          >
            <header className="painting-lightbox__header">
              <div>
                <h2 className="painting-lightbox__title">{painting.title}</h2>
                <span className="painting-lightbox__meta">
                  {painting.medium} — {painting.widthCm} × {painting.heightCm} cm
                </span>
              </div>
              <div className="painting-lightbox__controls">
                <button
                  type="button"
                  className="painting-lightbox__btn"
                  onClick={() => setLightboxZoomed((prev) => !prev)}
                  aria-pressed={lightboxZoomed}
                >
                  {lightboxZoomed ? 'Fit Screen' : 'Zoom 2.2×'}
                </button>
                <button
                  type="button"
                  className="painting-lightbox__btn painting-lightbox__close-btn"
                  onClick={closeLightbox}
                  aria-label="Close high-resolution view"
                >
                  ✕
                </button>
              </div>
            </header>

            <div
              className="painting-lightbox__body"
              onClick={(e) => {
                if (e.target === e.currentTarget) closeLightbox()
              }}
            >
              <div
                className="painting-lightbox__stage"
                data-zoomed={lightboxZoomed ? 'true' : 'false'}
                onClick={() => setLightboxZoomed((prev) => !prev)}
              >
                <img
                  src={activeImage}
                  alt={painting.title}
                  className="painting-lightbox__img"
                />
              </div>
            </div>

            <footer className="painting-lightbox__footer">
              <span>{lightboxZoomed ? 'Drag or pan to explore brushwork • Click to reset' : 'Tap or click to magnify texture • Press ESC to close'}</span>
            </footer>
          </div>,
          document.body,
        )}

      {/* ===================================================================
          CURATED COLLECTION RECOMMENDATIONS ("More from the Atelier")
          =================================================================== */}
      {relatedPaintings.length > 0 && (
        <section className="painting-detail__related" aria-label="More from the Atelier">
          <header className="painting-detail__related-header">
            <span className="painting-detail__related-eyebrow">Curated Selection</span>
            <h2 className="painting-detail__related-title">More Works from the Studio</h2>
          </header>
          <div className="painting-detail__related-grid">
            {relatedPaintings.map((related) => (
              <PaintingCard key={related.id} painting={related} />
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
