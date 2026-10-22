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

  const isSwitching = useRef(false)
  const isInitialMount = useRef(true)

  // Counts per category: available, reserved, sold
  const counts = useMemo(() => {
    let available = 0
    let reserved = 0
    let sold = 0
    paintings.forEach((p) => {
      const s = String(p.status || '').toLowerCase()
      if (s === 'sold') sold++
      else if (s === 'reserved') reserved++
      else if (s === 'available') available++
    })
    return { all: paintings.length, available, reserved, sold }
  }, [paintings])

  // Filter & sort: Available first, then reserved, then sold
  const displayedPaintings = useMemo(() => {
    let list = [...paintings]
    if (filter === 'available') {
      list = list.filter((p) => String(p.status || '').toLowerCase() === 'available')
    } else if (filter === 'reserved') {
      list = list.filter((p) => String(p.status || '').toLowerCase() === 'reserved')
    } else if (filter === 'sold') {
      list = list.filter((p) => String(p.status || '').toLowerCase() === 'sold')
    } else {
      // 'all': sort available first, then reserved, then sold
      const rank = (status) => {
        const s = String(status || '').toLowerCase()
        if (s === 'available') return 0
        if (s === 'reserved') return 1
        return 2
      }
      list.sort((a, b) => rank(a.status) - rank(b.status))
    }
    return list
  }, [paintings, filter])

  // Soothing transparent tab switch handler (on click)
  const handleFilterChange = (newFilter) => {
    if (newFilter === filter || isSwitching.current) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      setFilter(newFilter)
      return
    }

    isSwitching.current = true

    // Soothing fade-out of current paintings down to transparent
    if (gridRef.current) {
      gsap.to(gridRef.current, {
        opacity: 0.1,
        y: -8,
        duration: 0.22,
        ease: 'power2.in',
        onComplete: () => {
          setFilter(newFilter)
        },
      })
    } else {
      setFilter(newFilter)
    }
  }

  // Fade-in after category switch
  useEffect(() => {
    if (!isSwitching.current) return
    isSwitching.current = false

    if (gridRef.current) {
      gsap.fromTo(
        gridRef.current,
        { opacity: 0.1, y: 12 },
        {
          opacity: 1,
          y: 0,
          duration: 0.48,
          ease: 'power2.out',
        },
      )

      const items = itemsRef.current.filter(Boolean)
      if (items.length > 0) {
        gsap.fromTo(
          items,
          { opacity: 0, y: 16 },
          {
            opacity: 1,
            y: 0,
            duration: 0.45,
            stagger: 0.035,
            ease: 'power2.out',
          },
        )
      }
    }
  }, [displayedPaintings])

  // Initial load ScrollTrigger reveal animation
  useEffect(() => {
    if (loading || displayedPaintings.length === 0 || !isInitialMount.current) return
    isInitialMount.current = false

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

        {/* Filter Row: Segmented Gallery Toggles */}
        <div className="gallery-toggles" role="tablist" aria-label="Filter collection by availability">
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'all'}
            className={`gallery-toggle-btn ${filter === 'all' ? 'gallery-toggle-btn--active' : ''}`}
            onClick={() => handleFilterChange('all')}
          >
            All <span className="gallery-toggle-btn__count">({counts.all})</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'available'}
            className={`gallery-toggle-btn ${filter === 'available' ? 'gallery-toggle-btn--active' : ''}`}
            onClick={() => handleFilterChange('available')}
          >
            Available <span className="gallery-toggle-btn__count">({counts.available})</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'reserved'}
            className={`gallery-toggle-btn ${filter === 'reserved' ? 'gallery-toggle-btn--active' : ''}`}
            onClick={() => handleFilterChange('reserved')}
          >
            Reserved <span className="gallery-toggle-btn__count">({counts.reserved})</span>
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
