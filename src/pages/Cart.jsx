import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import PaintingCard from '../components/PaintingCard'
import { getAllPaintings, getPaintingsByIds } from '../data/api'
import { addToCart, getCartItems, removeFromCart, subscribeToCart } from '../utils/cartStorage'
import { formatPKR } from '../utils/formatPKR'
import { buildWhatsAppEnquiry } from '../config/site'
import '../styles/cart.css'

const REMOVE_ANIMATION_MS = 320
const UNDO_WINDOW_MS = 6000

/** Smoothly counts a number toward its target (instant under reduced motion). */
function useAnimatedNumber(target, duration = 520) {
  const [display, setDisplay] = useState(target)
  const displayRef = useRef(target)

  useEffect(() => {
    const from = displayRef.current
    if (from === target) return undefined

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const commit = (value) => {
      displayRef.current = value
      setDisplay(value)
    }

    if (reduced) {
      const id = requestAnimationFrame(() => commit(target))
      return () => cancelAnimationFrame(id)
    }

    let frame
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      commit(Math.round(from + (target - from) * eased))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, duration])

  return display
}

export default function Cart() {
  const [items, setItems] = useState(() => getCartItems())
  const [catalog, setCatalog] = useState([])
  const [dbItemsMap, setDbItemsMap] = useState({})
  const [removingKeys, setRemovingKeys] = useState([])
  const [undoItem, setUndoItem] = useState(null)
  const undoTimer = useRef(null)

  // Live cart sync (same tab + across tabs)
  useEffect(() => {
    const unsubscribe = subscribeToCart((updated) => setItems(updated))
    return unsubscribe
  }, [])

  // Refetch cart's paintings with getPaintingsByIds as source of truth
  useEffect(() => {
    const ids = items.map((i) => i.id).filter(Boolean)
    if (ids.length === 0) return
    let active = true
    getPaintingsByIds(ids)
      .then((records) => {
        if (!active) return
        const map = {}
        records.forEach((p) => {
          if (p.id) map[p.id] = p
          if (p.slug) map[p.slug] = p
        })
        setDbItemsMap(map)
      })
      .catch((err) => console.error('Failed to sync cart paintings by ID:', err))
    return () => {
      active = false
    }
  }, [items])

  // Latest data-layer catalog (for recommendations)
  useEffect(() => {
    let active = true
    getAllPaintings()
      .then((paintings) => {
        if (active) setCatalog(paintings)
      })
      .catch((err) => console.error('Failed to sync catalog status:', err))
    return () => {
      active = false
    }
  }, [])

  useEffect(() => () => clearTimeout(undoTimer.current), [])

  const getItemRecord = useCallback(
    (item) => {
      return dbItemsMap[item.id] || dbItemsMap[item.slug] || {}
    },
    [dbItemsMap]
  )

  const isItemUnavailable = useCallback(
    (item) => {
      const db = getItemRecord(item)
      const status = String(db.status || item.status || 'available').toLowerCase()
      return status === 'sold' || status === 'reserved'
    },
    [getItemRecord]
  )

  const getItemPrice = useCallback(
    (item) => {
      const db = getItemRecord(item)
      if (typeof db.price === 'number') return db.price
      if (typeof item.price === 'number') return item.price
      return 0
    },
    [getItemRecord]
  )

  const { availableItems, availableCount, unavailableCount, totalPKR } = useMemo(() => {
    const available = items.filter((item) => !isItemUnavailable(item))
    return {
      availableItems: available,
      availableCount: available.length,
      unavailableCount: items.length - available.length,
      totalPKR: available.reduce((sum, item) => sum + getItemPrice(item), 0),
    }
  }, [items, isItemUnavailable, getItemPrice])

  const animatedTotal = useAnimatedNumber(totalPKR)

  const handleRemove = (item) => {
    const key = item.id || item.slug
    if (removingKeys.includes(key)) return
    setRemovingKeys((keys) => [...keys, key])
    setTimeout(() => {
      removeFromCart(key)
      setRemovingKeys((keys) => keys.filter((k) => k !== key))
      setUndoItem(item)
      clearTimeout(undoTimer.current)
      undoTimer.current = setTimeout(() => setUndoItem(null), UNDO_WINDOW_MS)
    }, REMOVE_ANIMATION_MS)
  }

  const handleUndo = () => {
    if (!undoItem) return
    addToCart(undoItem)
    setUndoItem(null)
    clearTimeout(undoTimer.current)
  }

  // WhatsApp enquiry covering the whole selection
  const enquiry = useMemo(
    () =>
      buildWhatsAppEnquiry({
        title: availableItems.map((item) => item.title).join(', '),
        url: typeof window !== 'undefined' ? `${window.location.origin}/cart` : '',
      }),
    [availableItems]
  )

  const handleEnquiryClick = (e) => {
    if (!enquiry.isConfigured) {
      e.preventDefault()
      console.warn(enquiry.warning)
    }
  }

  const recommendations = useMemo(() => {
    const inCart = new Set(items.map((item) => item.id))
    return catalog.filter((p) => p.status !== 'sold' && !inCart.has(p.id)).slice(0, 3)
  }, [catalog, items])

  const similarWorksLink = '/shop'

  return (
    <main className="cart-page">
      <title>Cart — The Atelier by SK</title>

      <header className="cart-page__header">
        <span className="cart-page__eyebrow">The Atelier · Private Selection</span>
        <h1 className="cart-page__title">Acquisition Cart</h1>
        {items.length > 0 && (
          <p className="cart-page__count" aria-live="polite">
            {items.length} {items.length === 1 ? 'original work' : 'original works'} selected
          </p>
        )}
        <span className="cart-page__rule" aria-hidden="true" />
      </header>

      {items.length === 0 ? (
        <>
          <section className="cart-empty" aria-label="Empty Cart">
            <svg
              className="cart-empty__icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 8h14l-1.1 12H6.1L5 8Z" />
              <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
            </svg>
            <h2 className="cart-empty__title">Your Selection is Empty</h2>
            <p className="cart-empty__text">
              Every work at The Atelier is an original, one-of-one painting. Explore the
              collection to select available pieces.
            </p>
            <Link to="/shop" className="btn btn--gilded">
              <span>Explore The Collection</span>
              <span className="btn__arrow" aria-hidden="true">→</span>
            </Link>
          </section>

          {recommendations.length > 0 && (
            <section className="cart-recs" aria-label="More from the Studio">
              <header className="cart-recs__header">
                <span className="cart-page__eyebrow">Curated Selection</span>
                <h2 className="cart-recs__title">More from the Studio</h2>
              </header>
              <div className="cart-recs__grid">
                {recommendations.map((painting) => (
                  <PaintingCard key={painting.id} painting={painting} />
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        <div className="cart-layout">
          <section aria-label="Items in your acquisition cart">
            <ul className="cart-list" role="list">
              {items.map((item, index) => {
                const key = item.id || item.slug
                const db = getItemRecord(item)
                const status = String(db.status || item.status || 'available').toLowerCase()
                const isSold = status === 'sold'
                const isReserved = status === 'reserved'
                const isUnavailable = isSold || isReserved
                const removing = removingKeys.includes(key)
                const currentPrice = getItemPrice(item)
                const priceChanged =
                  typeof item.addedPrice === 'number' &&
                  typeof db.price === 'number' &&
                  item.addedPrice !== db.price

                const title = db.title || item.title || 'Untitled Work'
                const slug = db.slug || item.slug || ''
                const medium = db.medium || item.medium || 'Original Artwork'
                const widthCm = db.widthCm || item.widthCm || ''
                const heightCm = db.heightCm || item.heightCm || ''
                const imageSrc =
                  db.images?.[0] || item.images?.[0] || '/placeholders/placeholder-01.svg'

                return (
                  <li
                    key={key}
                    className={`cart-item ${isSold ? 'cart-item--sold' : ''} ${isReserved ? 'cart-item--reserved' : ''} ${removing ? 'cart-item--removing' : ''}`}
                    style={{ '--i': index }}
                  >
                    <div className="cart-item__inner">
                      <Link
                        to={`/painting/${slug}`}
                        className="cart-item__frame"
                        aria-label={`View ${title}`}
                      >
                        <span className="cart-item__image-wrap">
                          <img
                            src={imageSrc}
                            alt=""
                            className="cart-item__image"
                            width="140"
                            height="105"
                            loading="lazy"
                          />
                        </span>
                      </Link>

                      <div className="cart-item__content">
                        <div className="cart-item__header">
                          <Link to={`/painting/${slug}`} className="cart-item__title">
                            {title}
                          </Link>
                          <p className="cart-item__meta">
                            {medium} {widthCm && heightCm ? `— ${widthCm} × ${heightCm} cm` : ''}
                          </p>
                        </div>

                        {isSold && (
                          <div className="cart-item__sold-note" role="status">
                            <span className="cart-item__sold-badge">SOLD · Excluded from total</span>
                            <p className="cart-item__sold-text">This piece has found its home.</p>
                            <Link to={similarWorksLink} className="cart-item__sold-link">
                              Browse similar works →
                            </Link>
                          </div>
                        )}

                        {isReserved && (
                          <div className="cart-item__sold-note" role="status">
                            <span className="cart-item__sold-badge">RESERVED · Excluded from total</span>
                            <p className="cart-item__sold-text">This piece has an active reservation.</p>
                            <Link to={similarWorksLink} className="cart-item__sold-link">
                              Browse similar works →
                            </Link>
                          </div>
                        )}

                        <div className="cart-item__bottom">
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span
                              className={`cart-item__price ${isUnavailable ? 'cart-item__price--sold' : ''}`}
                            >
                              {formatPKR(currentPrice)}
                            </span>
                            {priceChanged && (
                              <span className="cart-item__price-change-note">
                                Price updated: was {formatPKR(item.addedPrice)}
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            className="cart-item__remove-btn"
                            onClick={() => handleRemove(item)}
                            aria-label={`Remove ${title} from acquisition list`}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>

          <aside className="cart-summary" aria-label="Acquisition Summary">
            <h2 className="cart-summary__title">Summary</h2>

            {unavailableCount > 0 && (
              <p className="cart-summary__sold-note" role="alert">
                {unavailableCount === 1
                  ? 'One artwork in your cart is sold or reserved and has been excluded from the total. Please remove it before proceeding.'
                  : `${unavailableCount} artworks in your cart are sold or reserved and have been excluded from the total. Please remove them before proceeding.`}
              </p>
            )}

            <dl className="cart-summary__lines">
              <div className="cart-summary__line">
                <dt>Available works</dt>
                <dd>{availableCount}</dd>
              </div>
              <div className="cart-summary__line">
                <dt>Subtotal</dt>
                <dd className="cart-summary__nowrap">{formatPKR(totalPKR)}</dd>
              </div>
            </dl>

            <div className="cart-summary__row cart-summary__row--total">
              <span className="cart-summary__label">Total</span>
              <span className="cart-summary__value" aria-label={`Total ${formatPKR(totalPKR)}`}>
                {formatPKR(animatedTotal)}
              </span>
            </div>

            <div className="cart-summary__actions">
              {availableCount > 0 && unavailableCount === 0 ? (
                <Link to="/checkout" className="btn btn--gilded cart-summary__checkout-btn">
                  <span>PROCEED TO CHECKOUT</span>
                  <span className="btn__arrow" aria-hidden="true">→</span>
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="btn btn--gilded cart-summary__checkout-btn btn--disabled"
                  aria-disabled="true"
                  title={unavailableCount > 0 ? 'Remove unavailable works to proceed' : undefined}
                >
                  <span>{unavailableCount > 0 ? 'REMOVE UNAVAILABLE WORKS' : 'PROCEED TO CHECKOUT'}</span>
                </button>
              )}

              {availableCount > 0 && (
                <a
                  href={enquiry.href}
                  target={enquiry.isConfigured ? '_blank' : undefined}
                  rel={enquiry.isConfigured ? 'noopener noreferrer' : undefined}
                  className={`cart-summary__enquire ${enquiry.isConfigured ? '' : 'cart-summary__enquire--disabled'}`}
                  onClick={handleEnquiryClick}
                  aria-disabled={!enquiry.isConfigured}
                  title={enquiry.isConfigured ? undefined : 'WhatsApp number not configured'}
                >
                  Enquire about this selection on WhatsApp
                </a>
              )}

              <Link to="/shop" className="cart-summary__continue-link">
                ← Continue exploring the collection
              </Link>
            </div>
          </aside>
        </div>
      )}

      {undoItem && (
        <div className="cart-toast" role="status" aria-live="polite">
          <span className="cart-toast__text">Removed “{undoItem.title}”</span>
          <button type="button" className="cart-toast__undo" onClick={handleUndo}>
            Undo
          </button>
        </div>
      )}
    </main>
  )
}
