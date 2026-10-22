import { useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { formatPKR } from '../utils/formatPKR'
import '../styles/painting-card.css'

export default function PaintingCard({ painting, variant = 'default', className = '' }) {
  const frameRef = useRef(null)
  const rectRef = useRef(null)
  const rafRef = useRef(null)

  const handlePointerEnter = useCallback(() => {
    if (!frameRef.current) return
    rectRef.current = frameRef.current.getBoundingClientRect()
  }, [])

  const handlePointerMove = useCallback((e) => {
    if (!frameRef.current) return
    if (typeof window !== 'undefined' && !window.matchMedia('(pointer: fine)').matches) return
    const clientX = e.clientX
    const clientY = e.clientY

    if (rafRef.current) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      if (!frameRef.current) return
      const rect = frameRef.current.getBoundingClientRect()
      const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
      const rx = ((0.5 - y) * 5).toFixed(2)
      const ry = ((x - 0.5) * 5).toFixed(2)
      const mx = (x * 100).toFixed(1)
      const my = (y * 100).toFixed(1)

      frameRef.current.style.setProperty('--rx', `${rx}deg`)
      frameRef.current.style.setProperty('--ry', `${ry}deg`)
      frameRef.current.style.setProperty('--mx', `${mx}%`)
      frameRef.current.style.setProperty('--my', `${my}%`)
    })
  }, [])

  const handlePointerLeave = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    rectRef.current = null
    if (!frameRef.current) return
    frameRef.current.style.setProperty('--rx', '0deg')
    frameRef.current.style.setProperty('--ry', '0deg')
    frameRef.current.style.setProperty('--mx', '50%')
    frameRef.current.style.setProperty('--my', '50%')
  }, [])

  if (!painting) return null

  const isSold = painting.status === 'sold'
  const isReserved = painting.status === 'reserved'
  const isUnavailable = isSold || isReserved
  const aspectRatio = painting.widthCm && painting.heightCm
    ? `${painting.widthCm} / ${painting.heightCm}`
    : '4 / 3'

  const primaryImage = painting.images?.[0] || ''

  return (
    <article
      className={`painting-card ${isSold ? 'painting-card--sold' : ''} ${isReserved ? 'painting-card--reserved' : ''} ${variant === 'editorial' ? 'painting-card--editorial' : ''} ${className}`}
    >
      <Link
        to={`/painting/${painting.slug}`}
        className="painting-card__link"
        aria-label={`${painting.title}, ${painting.medium}, ${painting.widthCm} by ${painting.heightCm} centimeters${isSold ? ', Sold' : isReserved ? ', Reserved' : `, ${formatPKR(painting.price)}`}`}
        onPointerEnter={!isUnavailable ? handlePointerEnter : undefined}
        onPointerMove={!isUnavailable ? handlePointerMove : undefined}
        onPointerLeave={!isUnavailable ? handlePointerLeave : undefined}
      >
        <div ref={frameRef} className="painting-card__frame">
          <div
            className="painting-card__image-wrap"
            style={{ aspectRatio }}
          >
            <img
              src={primaryImage}
              alt={painting.title}
              loading="lazy"
              decoding="async"
              className="painting-card__image"
              width={painting.widthCm * 10}
              height={painting.heightCm * 10}
            />

            {isSold && (
              <div className="painting-card__sold-overlay" aria-hidden="true">
                <div className="painting-card__sold-strike-wrap">
                  <span className="painting-card__sold-strike-line" />
                  <span className="painting-card__sold-badge">SOLD</span>
                  <span className="painting-card__sold-strike-line" />
                </div>
              </div>
            )}

            {isReserved && (
              <div className="painting-card__sold-overlay" aria-hidden="true">
                <div className="painting-card__sold-strike-wrap">
                  <span className="painting-card__sold-strike-line" />
                  <span className="painting-card__sold-badge painting-card__sold-badge--reserved">RESERVED</span>
                  <span className="painting-card__sold-strike-line" />
                </div>
              </div>
            )}
          </div>
          <div className="painting-card__sheen" aria-hidden="true" />
        </div>

        <div className="painting-card__details">
          <span className="painting-card__kicker">Original · One of one</span>
          <h3 className="painting-card__title">{painting.title}</h3>
          <p className="painting-card__meta">
            {painting.medium} — {painting.widthCm} × {painting.heightCm} cm
          </p>
          <div className="painting-card__price-row">
            {isSold ? (
              <div className="painting-card__sold-tag">
                <span className="painting-card__price-strikethrough">{formatPKR(painting.price)}</span>
                <span className="painting-card__sold-sep" aria-hidden="true">·</span>
                <span className="painting-card__sold-label">SOLD</span>
              </div>
            ) : isReserved ? (
              <div className="painting-card__sold-tag painting-card__reserved-tag">
                <span className="painting-card__sold-line" aria-hidden="true" />
                <span>RESERVED</span>
              </div>
            ) : (
              <span className="painting-card__price">{formatPKR(painting.price)}</span>
            )}
          </div>
        </div>
      </Link>
    </article>
  )
}
