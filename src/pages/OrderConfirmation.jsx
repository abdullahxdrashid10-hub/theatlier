import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { formatPKR } from '../utils/formatPKR'
import { readOrderSummary } from '../utils/orderSession'
import siteCopy from '../config/siteCopy'
import '../styles/checkout.css'

const PAYMENT_LABELS = {
  cod: 'Cash on delivery',
  bank: 'Bank transfer',
}

export default function OrderConfirmation() {
  const [order] = useState(() => readOrderSummary())

  if (!order || !order.orderId) return <Navigate to="/shop" replace />

  return (
    <main className="checkout-page">
      <title>Order Confirmation — The Atelier by SK</title>

      <header className="checkout-page__header">
        <span className="checkout-page__eyebrow">The Atelier · Thank you</span>
        <h1 className="checkout-page__title">Order Confirmation</h1>
        <span className="checkout-page__rule" aria-hidden="true" />
      </header>

      <div className="confirm-layout">
        <section className="confirm-card" aria-label="Order details">
          <div className="confirm-card__id-block">
            <span className="confirm-card__id-label">Order reference</span>
            <strong className="confirm-card__id">{order.orderId}</strong>
          </div>

          <ul className="checkout-summary__list" role="list">
            {order.items.map((item) => (
              <li key={item.id || item.slug} className="checkout-summary__item">
                <span className="checkout-summary__thumb">
                  <img
                    src={item.image || '/placeholders/placeholder-01.svg'}
                    alt=""
                    width="64"
                    height="48"
                    loading="lazy"
                  />
                </span>
                <span className="checkout-summary__info">
                  <span className="checkout-summary__name">{item.title}</span>
                  <span className="checkout-summary__meta">
                    {item.medium} — {item.widthCm} × {item.heightCm} cm
                  </span>
                </span>
                <span className="checkout-summary__price">{formatPKR(item.price)}</span>
              </li>
            ))}
          </ul>

          <dl className="confirm-card__lines">
            <div className="confirm-card__line">
              <dt>Payment method</dt>
              <dd>{PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}</dd>
            </div>
            <div className="confirm-card__line confirm-card__line--total">
              <dt>Total</dt>
              <dd className="confirm-card__total">{formatPKR(order.totalPKR)}</dd>
            </div>
          </dl>

          {order.paymentMethod === 'bank' && siteCopy.bankTransferNote && (
            <p className="checkout-pay__note">{siteCopy.bankTransferNoteText}</p>
          )}

          <div className="confirm-card__actions">
            <Link to="/shop" className="btn btn--framed">
              <span>Continue exploring</span>
              <span className="btn__arrow" aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
