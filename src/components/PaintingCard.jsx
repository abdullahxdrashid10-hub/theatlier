import { Link } from 'react-router-dom'
import { formatPKR } from '../utils/formatPKR'
import '../styles/painting-card.css'

// Exquisite high-resolution mockups for featured artworks
const MOCK_PREVIEWS = {
  'placeholder-ember-field': '/placeholders/mock-ember-field.jpg',
  'placeholder-bronze-hour': '/placeholders/mock-bronze-hour.jpg',
  'placeholder-gilded-wake': '/placeholders/mock-gilded-wake.jpg',
}

export default function PaintingCard({ painting, variant = 'default', className = '' }) {
  if (!painting) return null

  const isSold = painting.status === 'sold'
  const aspectRatio = painting.widthCm && painting.heightCm
    ? `${painting.widthCm} / ${painting.heightCm}`
    : '4 / 3'

  const primaryImage = MOCK_PREVIEWS[painting.slug] || painting.images?.[0] || '/placeholders/placeholder-01.svg'

  return (
    <article
      className={`painting-card ${isSold ? 'painting-card--sold' : ''} ${variant === 'editorial' ? 'painting-card--editorial' : ''} ${className}`}
    >
      <Link
        to={`/painting/${painting.slug}`}
        className="painting-card__link"
        aria-label={`${painting.title}, ${painting.medium}, ${painting.widthCm} by ${painting.heightCm} centimeters${isSold ? ', Sold' : `, ${formatPKR(painting.price)}`}`}
      >
        <div className="painting-card__frame">
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
          </div>
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
                <span className="painting-card__sold-line" aria-hidden="true" />
                <span>SOLD</span>
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
