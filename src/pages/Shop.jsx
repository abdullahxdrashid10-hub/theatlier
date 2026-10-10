import { useEffect, useMemo, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { getAllPaintings } from '../data/api'
import PaintingCard from '../components/PaintingCard'
import '../styles/shop.css'

gsap.registerPlugin(ScrollTrigger)

export default function Shop() {
  const [paintings, setPaintings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all') // 'all' | 'available' | 'sold'

  const headerRef = useRef(null)
  const gridRef = useRef(null)
  const itemsRef = useRef([])

  const handleRetry = () => {
    setLoading(true)
    setError(null)
    getAllPaintings()
      .then((data) => {
        setPaintings(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message || 'Failed to load paintings')
        setLoading(false)
      })
  }

  useEffect(() => {
    let active = true
    getAllPaintings()
      .then((data) => {
        if (active) {
          setPaintings(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || 'Failed to load paintings')
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [])

  // Filter & sort: Available first, then sold
  const displayedPaintings = useMemo(() => {
    let list = [...paintings]
    if (filter === 'available') {
      list = list.filter((p) => p.status === 'available')
    } else if (filter === 'sold') {
      list = list.filter((p) => p.status === 'sold')
    } else {
      // 'all': sort available first, then sold
      list.sort((a, b) => (a.status === 'available' ? 0 : 1) - (b.status === 'available' ? 0 : 1))
    }
    return list
  }, [paintings, filter])

  // ScrollTrigger reveal animation
  useEffect(() => {
    if (loading || displayedPaintings.length === 0) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    const ctx = gsap.context(() => {
      if (headerRef.current) {
        gsap.from(headerRef.current, {
          y: 24,
          opacity: 0,
          duration: 0.7,
          ease: 'power2.out',
          once: true,
        })
      }

      itemsRef.current.forEach((el, index) => {
        if (!el) return
        gsap.from(el, {
          y: 24,
          opacity: 0,
          duration: 0.7,
          delay: (index % 3) * 0.1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 88%',
            once: true,
          },
        })
      })
    }, gridRef)

    return () => {
      ctx.revert()
    }
  }, [loading, displayedPaintings])

  return (
    <main className="shop">
      <title>Shop — The Atelier by SK</title>

      <header ref={headerRef} className="shop__header">
        <span className="shop__eyebrow">The Collection</span>
        <h1 className="shop__title">Shop</h1>
        <p className="shop__subtitle">Original paintings, each one of one.</p>

        {/* Filter Row: All / Available / Sold */}
        <div className="shop__filters" role="tablist" aria-label="Filter collection by availability">
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'all'}
            className={`shop__filter-btn ${filter === 'all' ? 'shop__filter-btn--active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'available'}
            className={`shop__filter-btn ${filter === 'available' ? 'shop__filter-btn--active' : ''}`}
            onClick={() => setFilter('available')}
          >
            Available
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'sold'}
            className={`shop__filter-btn ${filter === 'sold' ? 'shop__filter-btn--active' : ''}`}
            onClick={() => setFilter('sold')}
          >
            Sold
          </button>
        </div>
      </header>

      {/* Grid, Loading, or Error */}
      {loading && (
        <div className="shop__loading" role="status" aria-live="polite">
          <div className="shop__spinner" aria-hidden="true" />
          <p>Loading collection...</p>
        </div>
      )}

      {error && !loading && (
        <div className="shop__error" role="alert">
          <p>Unable to load the collection at this time.</p>
          <button type="button" className="shop__retry-btn" onClick={handleRetry}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && displayedPaintings.length === 0 && (
        <div className="shop__empty">
          <p>No paintings found matching this filter.</p>
        </div>
      )}

      {!loading && !error && displayedPaintings.length > 0 && (
        <div ref={gridRef} className="shop__grid">
          {displayedPaintings.map((painting, index) => (
            <div
              key={painting.id}
              ref={(el) => (itemsRef.current[index] = el)}
              className="shop__grid-item"
            >
              <PaintingCard painting={painting} />
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
