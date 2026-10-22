import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { formatPKR } from '../utils/formatPKR'
import { readOrderSummary } from '../utils/orderSession'
import BankDetailsDropdown from '../components/checkout/BankDetailsDropdown'
import '../styles/checkout.css'

const PAYMENT_LABELS = {
  cod: 'Cash on delivery',
  bank: 'Bank transfer',
  bank_transfer: 'Bank transfer',
}

export default function OrderConfirmation() {
  const [order] = useState(() => readOrderSummary())

  const reference = order?.reference || order?.orderId
  if (!order || !reference) return <Navigate to="/shop" replace />

  const total = typeof order.total === 'number' ? order.total : order.totalPKR || 0
  const method = order.method || order.paymentMethod || 'cod'
  const items = order.items || []

  return (
    <main className="checkout-page">
      <title>Order Confirmation — The Atelier by SK</title>

      <header className="checkout-page__header">
        <span className="checkout-page__eyebrow">The Atelier</span>
        <h1 className="checkout-page__title">Order Received</h1>
        <span className="checkout-page__rule" aria-hidden="true" />
      </header>

      <div className="confirm-layout">
        <section className="confirm-card" aria-label="Order details">
          <p className="confirm-card__lead">Your order has been received.</p>

          <div className="confirm-card__id-block">
            <span className="confirm-card__id-label">Order reference</span>
            <strong className="confirm-card__id">{reference}</strong>
          </div>

          {items.length > 0 && (
            <ul className="checkout-summary__list" role="list">
              {items.map((item, index) => {
                const title = typeof item === 'string' ? item : item.title || 'Artwork'
                const price = typeof item === 'object' && item !== null ? item.price_pkr ?? item.price : null
                return (
                  <li key={item.painting_id || item.id || index} className="checkout-summary__item">
                    <span className="checkout-summary__info">
                      <span className="checkout-summary__name">{title}</span>
                    </span>
                    {typeof price === 'number' && (
                      <span className="checkout-summary__price">{formatPKR(price)}</span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}

          <dl className="confirm-card__lines">
            <div className="confirm-card__line">
              <dt>Payment method</dt>
              <dd>{PAYMENT_LABELS[method] || method}</dd>
            </div>
            <div className="confirm-card__line confirm-card__line--total">
              <dt>Total</dt>
              <dd className="confirm-card__total">{formatPKR(total)}</dd>
            </div>
          </dl>

          {(method === 'bank' || method === 'bank_transfer') && (
            <div style={{ marginTop: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
              <BankDetailsDropdown initialOpen={true} />
            </div>
          )}

          {method === 'cod' && (
            <div style={{ marginTop: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
              <p className="checkout-pay__note checkout-pay__note--cod" style={{ marginBottom: 'var(--space-2)' }}>
                <strong>Cash on Delivery (50% Advance Required):</strong> To confirm your order, kindly transfer 50% of your total in advance to the bank / Easypaisa account below:
              </p>
              <BankDetailsDropdown initialOpen={true} />
            </div>
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
