import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAllPaintings, getPaintingBySlug } from '../../data/api'
import { formatPKR } from '../../utils/formatPKR'

export default function CuratorPaintingCard({ slug, initialPainting, onSelectArtwork, onOpenSimulator }) {
  const [fetchedPainting, setFetchedPainting] = useState(null)
  const [loading, setLoading] = useState(!initialPainting)

  useEffect(() => {
    if (initialPainting || !slug) return

    let active = true
    const cleanSlug = String(slug).toLowerCase().trim()

    // 1. Direct query
    getPaintingBySlug(cleanSlug)
      .then((data) => {
        if (active && data) {
          setFetchedPainting(data)
          setLoading(false)
          return
        }

        // 2. Fallback prefix attempts
        const altSlug = cleanSlug.startsWith('placeholder-')
          ? cleanSlug.replace('placeholder-', '')
          : `placeholder-${cleanSlug}`

        return getPaintingBySlug(altSlug).then((altData) => {
          if (active && altData) {
            setFetchedPainting(altData)
            setLoading(false)
            return
          }

          // 3. Search in all paintings for best match
          return getAllPaintings().then((all) => {
            if (!active || !all) return
            const match = all.find(
              (p) =>
                p.slug.includes(cleanSlug) ||
                cleanSlug.includes(p.slug) ||
                p.title.toLowerCase().includes(cleanSlug.replace(/-/g, ' '))
            )
            if (match) {
              setFetchedPainting(match)
            }
            setLoading(false)
          })
        })
      })
      .catch((err) => {
        console.warn(`Curator card: artwork resolution notice for '${slug}':`, err)
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [slug, initialPainting])

  const painting = initialPainting || fetchedPainting

  if (loading) {
    return (
      <div className="curator-card curator-card--loading">
        <div className="curator-card__loading-pulse" />
        <span>Consulting Studio Ledger…</span>
      </div>
    )
  }

  // Graceful fallback display if painting is truly not in catalog
  if (!painting) {
    const formattedTitle = String(slug || 'Studio Original')
      .replace(/^(placeholder-)/, '')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())

    return (
      <article className="curator-card curator-card--fallback" aria-label={`Archival reference: ${formattedTitle}`}>
        <div className="curator-card__fallback-inner">
          <span className="curator-card__badge curator-card__badge--archive">Archival Reference</span>
          <h4 className="curator-card__title">{formattedTitle}</h4>
          <p className="curator-card__meta">Original Studio Work · Hand-sculpted Impasto</p>
          <div className="curator-card__actions">
            <Link to="/shop" className="curator-card__btn curator-card__btn--primary" onClick={onSelectArtwork}>
              Explore Available Works →
            </Link>
          </div>
        </div>
      </article>
    )
  }

  const status = String(painting.status || 'available').toLowerCase()
  const isAvailable = status === 'available'
  const isReserved = status === 'reserved'
  const imageSrc = painting.images?.[0] || '/placeholders/placeholder-01.svg'

  return (
    <article className="curator-card" aria-label={`Curator recommendation: ${painting.title}`}>
      <div className="curator-card__thumb-wrap">
        <img
          src={imageSrc}
          alt={painting.title}
          className="curator-card__thumb"
          loading="lazy"
          width="400"
          height="240"
        />
        <div className="curator-card__thumb-scrim" />
        <span
          className={`curator-card__badge ${
            isAvailable
              ? 'curator-card__badge--available'
              : isReserved
              ? 'curator-card__badge--reserved'
              : 'curator-card__badge--sold'
          }`}
        >
          {isAvailable ? 'Available · 1 of 1' : isReserved ? 'Reserved' : 'Acquired'}
        </span>
      </div>

      <div className="curator-card__details">
        <div className="curator-card__header-row">
          <h4 className="curator-card__title">{painting.title}</h4>
          <span className="curator-card__price">{formatPKR(painting.price)}</span>
        </div>

        <p className="curator-card__meta">
          {painting.medium} · {painting.widthCm} × {painting.heightCm} cm ({painting.year})
        </p>

        <div className="curator-card__actions">
          <Link
            to={`/painting/${painting.slug}`}
            className="curator-card__btn curator-card__btn--primary"
            onClick={onSelectArtwork}
          >
            <span>Acquire / View Details</span>
            <span aria-hidden="true">→</span>
          </Link>

          {onOpenSimulator && (
            <button
              type="button"
              className="curator-card__btn curator-card__btn--secondary"
              onClick={() => onOpenSimulator(painting)}
              title="Simulate on your wall in true scale"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <span>View On Wall</span>
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
