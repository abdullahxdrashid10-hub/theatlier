import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { gsap } from 'gsap'
import { getAllPaintings, getPaintingBySlug } from '../data/api'
import PaintingCard from '../components/PaintingCard'
import { addToCart, isInCart, subscribeToCart } from '../utils/cartStorage'
import { formatPKR } from '../utils/formatPKR'
import { lockScroll } from '../utils/scroll'
import siteCopy from '../config/siteCopy'
import { buildWhatsAppEnquiry } from '../config/site'
import WallSimulator from '../components/WallSimulator'
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

function WallIcon() {
  return (
    <svg className="painting-detail__zoom-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="9" y1="21" x2="9" y2="9" />
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
  const [wallSimulatorOpen, setWallSimulatorOpen] = useState(false)

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

  const [reloadKey, setReloadKey] = useState(0)

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
  }, [slug, reloadKey])

  const handleRetry = () => {
    setLoading(true)
    setError(null)
    setReloadKey((k) => k + 1)
  }

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

    // Strictly enforce: Sold or Reserved works cannot be added to the cart
    if (painting.status === 'sold' || painting.status === 'reserved') {
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

  const whatsAppEnquiry = useMemo(() => {
    if (!painting) return { href: '#', isConfigured: false }
    return buildWhatsAppEnquiry({
      title: painting.title,
      url: typeof window !== 'undefined' ? window.location.href : '',
    })
  }, [painting])

  useEffect(() => {
    if (painting && !whatsAppEnquiry.isConfigured && whatsAppEnquiry.warning) {
      console.warn(whatsAppEnquiry.warning)
    }
  }, [painting, whatsAppEnquiry])

  const handleWhatsAppClick = (e) => {
    if (!whatsAppEnquiry.isConfigured) {
      e.preventDefault()
      console.warn(
        whatsAppEnquiry.warning ||
          'WhatsApp enquiry is disabled: WHATSAPP_NUMBER is currently set to TODO_CLIENT_NUMBER.'
      )
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

  // Error State
  if (error) {
    return (
      <main className="painting-detail">
        <title>Catalog Unavailable — The Atelier by SK</title>
        <div className="painting-detail__error" role="alert">
          <h1 className="painting-detail__error-title">Unable to Load Artwork</h1>
          <p>{error}</p>
          <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center', marginTop: 'var(--space-5)' }}>
            <button type="button" className="btn btn--gilded" onClick={handleRetry}>
              Retry Connection
            </button>
            <Link to="/shop" className="btn btn--minimal">
              Explore Collection <span className="btn__arrow">→</span>
            </Link>
          </div>
        </div>
      </main>
    )
  }

  // Not Found State
  if (!painting) {
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

  const isSold = String(painting.status || '').toLowerCase() === 'sold'
  const isReserved = String(painting.status || '').toLowerCase() === 'reserved'
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

              {/* Sold/Reserved Watermark Indicator on Frame */}
              {isSold && (
                <div className="painting-detail__sold-watermark">
                  <span>SOLD</span>
                </div>
              )}
              {isReserved && (
                <div className="painting-detail__sold-watermark">
                  <span>RESERVED</span>
                </div>
              )}

              {/* Floating Zoom / Tap Cue Badge */}
              <div className="painting-detail__zoom-cue" aria-hidden="true">
                <ZoomIcon />
                <span>{isZooming ? 'Magnification 2.5×' : 'Hover to magnify · Tap for full'}</span>
              </div>
            </div>
          </div>

          {/* Action Trigger Buttons for Inspection & Scale Simulation */}
          <div className="painting-detail__visual-actions">
            <button
              type="button"
              className="painting-detail__inspect-btn"
              onClick={openLightbox}
              aria-haspopup="dialog"
            >
              <ZoomIcon />
              <span>Examine High-Res Texture</span>
            </button>
            <button
              type="button"
              className="painting-detail__wall-btn"
              onClick={() => setWallSimulatorOpen(true)}
              aria-haspopup="dialog"
            >
              <WallIcon />
              <span>View to Scale on Wall</span>
            </button>
          </div>

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
              className={`painting-detail__badge ${
                isSold || isReserved
                  ? 'painting-detail__badge--sold'
                  : 'painting-detail__badge--available'
              }`}
              role="status"
            >
              <span className="painting-detail__badge-dot" aria-hidden="true" />
              <span>{isSold ? 'SOLD' : isReserved ? 'RESERVED' : 'Available for Acquisition'}</span>
            </div>
          </div>

          {/* Title */}
          <h1 className="painting-detail__title">{painting.title}</h1>

          {/* Price Row: Never wraps, fluid font size, note below */}
          <div className="painting-detail__price-row">
            {isSold ? (
              <>
                <span className="painting-detail__price painting-detail__price--sold">
                  {formatPKR(painting.price)}
                </span>
                <span className="painting-detail__price-note">
                  This piece has found its home.
                </span>
              </>
            ) : isReserved ? (
              <>
                <span className="painting-detail__price painting-detail__price--sold">
                  {formatPKR(painting.price)}
                </span>
                <span className="painting-detail__price-note">
                  This piece has an active reservation.
                </span>
              </>
            ) : (
              <>
                <span className="painting-detail__price">
                  {formatPKR(painting.price)}
                </span>
                {siteCopy.showFramingShippingNote && (
                  <span className="painting-detail__price-note">
                    {siteCopy.framingShippingNote}
                  </span>
                )}
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
                <button
                  type="button"
                  className="painting-detail__spec-scale-link"
                  onClick={() => setWallSimulatorOpen(true)}
                  aria-label="View painting to scale in room"
                >
                  View in room →
                </button>
              </span>
            </div>
            <div className="painting-detail__spec-item">
              <span className="painting-detail__spec-label">Creation Year</span>
              <span className="painting-detail__spec-value">{painting.year}</span>
            </div>
            {siteCopy.showAuthenticityDetails && (
              <div className="painting-detail__spec-item">
                <span className="painting-detail__spec-label">Authenticity</span>
                <span className="painting-detail__spec-value">{siteCopy.authenticitySpec}</span>
              </div>
            )}
          </div>

          {/* Action Box: Acquisition or Sold/Reserved Handling */}
          <div className="painting-detail__action-box">
            {isSold || isReserved ? (
              <>
                {/* Strictly disabled button when artwork is sold or reserved */}
                <button
                  type="button"
                  disabled
                  className="btn btn--framed painting-detail__cta painting-detail__cta--sold"
                  aria-disabled="true"
                  title={isSold ? "This artwork has been sold and cannot be added to the cart" : "This artwork is reserved and cannot be added to the cart"}
                >
                  {isSold ? 'SOLD' : 'RESERVED'}
                </button>
                <div className="painting-detail__secondary-actions">
                  <a
                    href={whatsAppEnquiry.href}
                    target={whatsAppEnquiry.isConfigured ? '_blank' : undefined}
                    rel={whatsAppEnquiry.isConfigured ? 'noopener noreferrer' : undefined}
                    className={`painting-detail__whatsapp-link ${!whatsAppEnquiry.isConfigured ? 'painting-detail__whatsapp-link--disabled' : ''}`}
                    onClick={handleWhatsAppClick}
                    aria-disabled={!whatsAppEnquiry.isConfigured}
                    title={!whatsAppEnquiry.isConfigured ? 'WhatsApp number not configured' : undefined}
                  >
                    <span className="painting-detail__whatsapp-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm.02 18.06c-1.5 0-2.97-.4-4.25-1.16l-.3-.18-3.13.82.83-3.05-.2-.32a7.89 7.89 0 0 1-1.22-4.26c0-4.38 3.57-7.95 7.97-7.95 2.13 0 4.13.83 5.64 2.33a7.93 7.93 0 0 1 2.33 5.64c0 4.38-3.56 7.95-7.97 7.95zm4.37-5.96c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.21-1.44-1.35-1.68-.14-.24-.01-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.41-.54-.42h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2 0 1.18.86 2.32.98 2.48.12.16 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28z" />
                      </svg>
                    </span>
                    <span>ENQUIRE ON WHATSAPP</span>
                    <span className="btn__arrow" aria-hidden="true">→</span>
                  </a>
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
                  <a
                    href={whatsAppEnquiry.href}
                    target={whatsAppEnquiry.isConfigured ? '_blank' : undefined}
                    rel={whatsAppEnquiry.isConfigured ? 'noopener noreferrer' : undefined}
                    className={`painting-detail__whatsapp-link ${!whatsAppEnquiry.isConfigured ? 'painting-detail__whatsapp-link--disabled' : ''}`}
                    onClick={handleWhatsAppClick}
                    aria-disabled={!whatsAppEnquiry.isConfigured}
                    title={!whatsAppEnquiry.isConfigured ? 'WhatsApp number not configured' : undefined}
                  >
                    <span className="painting-detail__whatsapp-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm.02 18.06c-1.5 0-2.97-.4-4.25-1.16l-.3-.18-3.13.82.83-3.05-.2-.32a7.89 7.89 0 0 1-1.22-4.26c0-4.38 3.57-7.95 7.97-7.95 2.13 0 4.13.83 5.64 2.33a7.93 7.93 0 0 1 2.33 5.64c0 4.38-3.56 7.95-7.97 7.95zm4.37-5.96c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.21-1.44-1.35-1.68-.14-.24-.01-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.41-.54-.42h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2 0 1.18.86 2.32.98 2.48.12.16 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28z" />
                      </svg>
                    </span>
                    <span>ENQUIRE ON WHATSAPP</span>
                    <span className="btn__arrow" aria-hidden="true">→</span>
                  </a>
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
                    {siteCopy.showMaterialsClaims && (
                      <p>{siteCopy.materialsClaims}</p>
                    )}
                  </div>
                </div>
              </div>
            </details>

            {siteCopy.showAuthenticityDetails && (
              <details className="painting-detail__accordion">
                <summary className="painting-detail__accordion-summary">
                  <span>{siteCopy.authenticityDossier.title}</span>
                  <span className="painting-detail__accordion-icon" aria-hidden="true">+</span>
                </summary>
                <div className="painting-detail__accordion-wrapper">
                  <div className="painting-detail__accordion-inner">
                    <div className="painting-detail__accordion-content">
                      <p>{siteCopy.authenticityDossier.intro}</p>
                      <ul className="painting-detail__bullet-list">
                        {siteCopy.authenticityDossier.items.map((item) => (
                          <li key={item} className="painting-detail__bullet-item">
                            <span className="painting-detail__bullet-icon">✦</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </details>
            )}

            {siteCopy.showShippingAccordion && (
              <details className="painting-detail__accordion">
                <summary className="painting-detail__accordion-summary">
                  <span>{siteCopy.shippingDetails.title}</span>
                  <span className="painting-detail__accordion-icon" aria-hidden="true">+</span>
                </summary>
                <div className="painting-detail__accordion-wrapper">
                  <div className="painting-detail__accordion-inner">
                    <div className="painting-detail__accordion-content">
                      <p>{siteCopy.shippingDetails.intro}</p>
                      <ul className="painting-detail__bullet-list">
                        {siteCopy.shippingDetails.items.map((item) => (
                          <li key={item} className="painting-detail__bullet-item">
                            <span className="painting-detail__bullet-icon">✦</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </details>
            )}
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

      {/* Interactive Wall Scale Simulator Modal */}
      <WallSimulator
        painting={painting}
        isOpen={wallSimulatorOpen}
        onClose={() => setWallSimulatorOpen(false)}
      />
    </main>
  )
}
