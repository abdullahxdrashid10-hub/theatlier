import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getPaintingBySlug } from '../../data/api'
import { formatPKR } from '../../utils/formatPKR'

export default function CuratorPaintingCard({ slug, initialPainting, onSelectArtwork, onOpenSimulator }) {
  const [fetchedPainting, setFetchedPainting] = useState(null)
  const [loading, setLoading] = useState(!initialPainting)

  useEffect(() => {
    if (initialPainting || !slug) return

    let active = true
    getPaintingBySlug(slug)
      .then((data) => {
        if (active && data) {
          setFetchedPainting(data)
        }
      })
      .catch((err) => {
        console.warn(`Curator card: artwork not located for slug '${slug}':`, err)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [slug, initialPainting])

  const painting = initialPainting || fetchedPainting

  if (loading) {
    return (
      <div className="curator-card" style={{ padding: '16px', textAlign: 'center', color: 'var(--taupe)' }}>
        <span style={{ fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Accessing Artwork Archives…
        </span>
      </div>
    )
  }

  // Deterministic Guard: If slug is hallucinated or doesn't exist, gracefully suppress
  if (!painting) return null

  const status = String(painting.status || 'available').toLowerCase()
  const isAvailable = status === 'available'
  const isReserved = status === 'reserved'

  const imageSrc = painting.images?.[0] || '/placeholders/placeholder-01.svg'

  return (
    <article className="curator-card" aria-label={`Artwork recommendation: ${painting.title}`}>
      <div className="curator-card__thumb-wrap">
        <img
          src={imageSrc}
          alt={painting.title}
          className="curator-card__thumb"
          loading="lazy"
          width="400"
          height="250"
        />
        <span
          className={`curator-card__badge ${
            isAvailable
              ? 'curator-card__badge--available'
              : isReserved
              ? 'curator-card__badge--reserved'
              : 'curator-card__badge--sold'
          }`}
        >
          {isAvailable ? 'Available' : isReserved ? 'Reserved' : 'Sold'}
        </span>
      </div>

      <div className="curator-card__details">
        <h4 className="curator-card__title">{painting.title}</h4>
        <p className="curator-card__meta">
          {painting.medium} · {painting.widthCm} × {painting.heightCm} cm ({painting.year})
        </p>
        <span className="curator-card__price">
          {formatPKR(painting.price)}
        </span>

        <div className="curator-card__actions">
          <Link
            to={`/painting/${painting.slug}`}
            className="curator-card__btn curator-card__btn--primary"
            onClick={onSelectArtwork}
          >
            View Artwork →
          </Link>

          {onOpenSimulator && (
            <button
              type="button"
              className="curator-card__btn curator-card__btn--secondary"
              onClick={() => onOpenSimulator(painting)}
            >
              Simulate in Room
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
