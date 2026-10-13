import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAllPaintings } from '../data/api'
import { getCartItems, removeFromCart, subscribeToCart } from '../utils/cartStorage'
import { formatPKR } from '../utils/formatPKR'
import '../styles/cart.css'

export default function Cart() {
  const [items, setItems] = useState(() => getCartItems())
  const [latestCatalog, setLatestCatalog] = useState({})

  // Subscribe to live cart changes (across tabs and within current tab)
  useEffect(() => {
    const unsubscribe = subscribeToCart((updated) => {
      setItems(updated)
    })
    return unsubscribe
  }, [])

  // Fetch latest catalog to check live data-layer availability
  useEffect(() => {
    let active = true
    getAllPaintings()
      .then((paintings) => {
        if (!active) return
        const map = {}
        paintings.forEach((p) => {
          map[p.id] = p
          map[p.slug] = p
        })
        setLatestCatalog(map)
      })
      .catch((err) => {
        console.error('Failed to sync catalog status:', err)
      })
    return () => {
      active = false
    }
  }, [])

  // Check if an item is sold in the data layer
  const isItemSold = useCallback(
    (item) => {
      const fresh = latestCatalog[item.id] || latestCatalog[item.slug]
      if (fresh) {
        return fresh.status === 'sold'
      }
      return item.status === 'sold'
    },
    [latestCatalog]
  )

  // Calculate total: exclude sold items
  const { availableCount, soldCount, totalPKR } = useMemo(() => {
    let available = 0
    let sold = 0
    let sum = 0

    items.forEach((item) => {
      if (isItemSold(item)) {
        sold++
      } else {
        available++
        sum += item.price || 0
      }
    })

    return { availableCount: available, soldCount: sold, totalPKR: sum }
  }, [items, isItemSold])

  const handleRemove = (itemId, itemSlug) => {
    removeFromCart(itemId || itemSlug)
  }

  return (
    <main className="cart-page">
      <title>Cart — The Atelier by SK</title>

      <header className="cart-page__header">
        <span className="cart-page__eyebrow">The Atelier · Private Selection</span>
        <h1 className="cart-page__title">Acquisition Cart</h1>
      </header>

      {items.length === 0 ? (
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
      ) : (
        <div className="cart-layout">
          {/* Items List */}
          <section aria-label="Items in your acquisition cart">
            <ul className="cart-list" role="list">
              {items.map((item) => {
                const sold = isItemSold(item)
                const imageSrc =
                  item.images?.[0] || '/placeholders/placeholder-01.svg'

                return (
                  <li
                    key={item.id || item.slug}
                    className={`cart-item ${sold ? 'cart-item--sold' : ''}`}
                  >
                    <Link
                      to={`/painting/${item.slug}`}
                      className="cart-item__image-wrap"
                      aria-label={`View ${item.title}`}
                    >
                      <img
                        src={imageSrc}
                        alt=""
                        className="cart-item__image"
                        width="88"
                        height="66"
                        loading="lazy"
                      />
                    </Link>

                    <div className="cart-item__content">
                      <div className="cart-item__header">
                        <Link
                          to={`/painting/${item.slug}`}
                          className="cart-item__title"
                        >
                          {item.title}
                        </Link>
                        <p className="cart-item__meta">
                          {item.medium} — {item.widthCm} × {item.heightCm} cm
                        </p>
                        {sold && (
                          <span
                            className="cart-item__sold-badge"
                            role="status"
                            aria-label="This artwork is sold and excluded from total"
                          >
                            SOLD · Excluded from total
                          </span>
                        )}
                      </div>

                      <div className="cart-item__bottom">
                        <span
                          className={`cart-item__price ${sold ? 'cart-item__price--sold' : ''}`}
                        >
                          {formatPKR(item.price)}
                        </span>

                        <button
                          type="button"
                          className="cart-item__remove-btn"
                          onClick={() => handleRemove(item.id, item.slug)}
                          aria-label={`Remove ${item.title} from acquisition list`}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>

          {/* Acquisition Summary */}
          <aside className="cart-summary" aria-label="Acquisition Summary">
            <h2 className="cart-summary__title">Summary</h2>

            {soldCount > 0 && (
              <p className="cart-summary__sold-note" role="alert">
                {soldCount === 1
                  ? 'One artwork in your cart is sold and has been excluded from the total.'
                  : `${soldCount} artworks in your cart are sold and have been excluded from the total.`}
              </p>
            )}

            <div className="cart-summary__row">
              <span className="cart-summary__label">Total</span>
              <span className="cart-summary__value">{formatPKR(totalPKR)}</span>
            </div>

            <div className="cart-summary__actions">
              {availableCount > 0 ? (
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
                >
                  <span>PROCEED TO CHECKOUT</span>
                </button>
              )}

              <Link to="/shop" className="cart-summary__continue-link">
                ← Continue exploring the collection
              </Link>
            </div>
          </aside>
        </div>
      )}
    </main>
  )
}
