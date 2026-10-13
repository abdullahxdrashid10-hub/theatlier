import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { getAllPaintings, submitOrder } from '../data/api'
import { clearCart, getCartItems, subscribeToCart } from '../utils/cartStorage'
import { formatPKR } from '../utils/formatPKR'
import { formatPKPhone, normalisePKPhone } from '../utils/phone'
import { saveOrderSummary } from '../utils/orderSession'
import siteCopy from '../config/siteCopy'
import '../styles/checkout.css'

const FIELD_ORDER = ['name', 'phone', 'email', 'city', 'address']
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const PAYMENT_OPTIONS = [
  { value: 'cod', label: 'Cash on delivery' },
  { value: 'bank', label: 'Bank transfer' },
]

function validate(values) {
  const errors = {}
  if (values.name.trim().length < 2) errors.name = 'Please enter your full name.'
  if (!values.phone.trim()) {
    errors.phone = 'Please enter your mobile number.'
  } else if (!normalisePKPhone(values.phone)) {
    errors.phone = 'Enter a Pakistani mobile number, e.g. 0300 1234567 or +92 300 1234567.'
  }
  if (values.email.trim() && !EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = 'This email address does not look right.'
  }
  if (values.city.trim().length < 2) errors.city = 'Please enter your city.'
  if (values.address.trim().length < 8) errors.address = 'Please enter your full address.'
  return errors
}

function Field({ id, label, optional, hint, error, multiline, ...inputProps }) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(' ')
  const Control = multiline ? 'textarea' : 'input'

  return (
    <div className={`checkout-field ${error ? 'checkout-field--invalid' : ''}`}>
      <label htmlFor={id} className="checkout-field__label">
        {label}
        {optional && <span className="checkout-field__optional"> (optional)</span>}
      </label>
      <Control
        id={id}
        className="checkout-field__control"
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy || undefined}
        {...inputProps}
      />
      {hint && (
        <p id={`${id}-hint`} className="checkout-field__hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="checkout-field__error">
          {error}
        </p>
      )}
    </div>
  )
}

export default function Checkout() {
  const navigate = useNavigate()
  const [items, setItems] = useState(() => getCartItems())
  const [catalog, setCatalog] = useState({})
  const [values, setValues] = useState({
    name: '',
    phone: '',
    email: '',
    city: '',
    address: '',
    notes: '',
  })
  const [errors, setErrors] = useState({})
  const [payment, setPayment] = useState('cod')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [done, setDone] = useState(false)
  const errorRef = useRef(null)

  useEffect(() => subscribeToCart((updated) => setItems(updated)), [])

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
        setCatalog(map)
      })
      .catch((err) => console.error('Failed to sync catalog status:', err))
    return () => {
      active = false
    }
  }, [])

  // Move focus to the error message whenever a submit error appears
  useEffect(() => {
    if (submitError) errorRef.current?.focus()
  }, [submitError])

  const isItemSold = useCallback(
    (item) => {
      const fresh = catalog[item.id] || catalog[item.slug]
      return fresh ? fresh.status === 'sold' : item.status === 'sold'
    },
    [catalog]
  )

  const { soldItems, availableItems, totalPKR } = useMemo(() => {
    const sold = items.filter(isItemSold)
    const available = items.filter((item) => !isItemSold(item))
    return {
      soldItems: sold,
      availableItems: available,
      totalPKR: available.reduce((sum, item) => sum + (item.price || 0), 0),
    }
  }, [items, isItemSold])

  const setField = (name) => (e) => {
    const { value } = e.target
    setValues((prev) => ({ ...prev, [name]: value }))
    // Clear an error as soon as the user starts correcting it
    setErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev))
  }

  const handleBlur = (name) => () => {
    if (name === 'phone') {
      const normalised = normalisePKPhone(values.phone)
      if (normalised) {
        setValues((prev) => ({ ...prev, phone: formatPKPhone(normalised) }))
        return
      }
    }
    if (!FIELD_ORDER.includes(name)) return
    const fieldError = validate(values)[name]
    // Only flag a field on blur once the user has typed something, or left a required one empty
    setErrors((prev) => ({ ...prev, [name]: fieldError }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return

    const found = validate(values)
    setErrors(found)
    const firstInvalid = FIELD_ORDER.find((name) => found[name])
    if (firstInvalid) {
      document.getElementById(`co-${firstInvalid}`)?.focus()
      return
    }

    setSubmitError(null)
    setSubmitting(true)

    try {
      // Re-check availability against the data layer right before submitting
      const fresh = await getAllPaintings()
      const freshMap = {}
      fresh.forEach((p) => {
        freshMap[p.id] = p
        freshMap[p.slug] = p
      })
      setCatalog(freshMap)

      const current = getCartItems()
      const nowSold = current.filter((item) => {
        const match = freshMap[item.id] || freshMap[item.slug]
        return match ? match.status === 'sold' : item.status === 'sold'
      })
      if (nowSold.length > 0) {
        setSubmitError({ kind: 'sold', titles: nowSold.map((item) => item.title) })
        setSubmitting(false)
        return
      }

      const orderItems = current.map((item) => ({
        id: item.id,
        slug: item.slug,
        title: item.title,
        medium: item.medium,
        widthCm: item.widthCm,
        heightCm: item.heightCm,
        price: item.price,
        image: item.images?.[0] || null,
      }))
      const total = orderItems.reduce((sum, item) => sum + (item.price || 0), 0)

      const { orderId } = await submitOrder({
        customer: {
          name: values.name.trim(),
          phone: normalisePKPhone(values.phone),
          email: values.email.trim() || null,
          city: values.city.trim(),
          address: values.address.trim(),
          notes: values.notes.trim() || null,
        },
        paymentMethod: payment,
        items: orderItems,
        totalPKR: total,
      })

      // Only the order summary (no contact details) is handed to the confirmation page
      saveOrderSummary({ orderId, items: orderItems, totalPKR: total, paymentMethod: payment })
      setDone(true)
      clearCart()
      navigate('/order-confirmation', { replace: true })
    } catch (err) {
      console.error('Order submission failed:', err)
      setSubmitError({ kind: 'generic' })
      setSubmitting(false)
    }
  }

  if (done) return null
  if (items.length === 0) return <Navigate to="/cart" replace />

  return (
    <main className="checkout-page">
      <title>Checkout — The Atelier by SK</title>

      <header className="checkout-page__header">
        <span className="checkout-page__eyebrow">The Atelier · Checkout</span>
        <h1 className="checkout-page__title">Checkout</h1>
        <span className="checkout-page__rule" aria-hidden="true" />
      </header>

      <div className="checkout-layout">
        <form className="checkout-form" onSubmit={handleSubmit} noValidate aria-label="Checkout">
          {(soldItems.length > 0 || submitError) && (
            <div
              ref={errorRef}
              tabIndex={-1}
              className="checkout-alert"
              role="status"
              aria-live="polite"
            >
              {submitError?.kind === 'generic' ? (
                <p>
                  We couldn’t place your order just now. Please try again in a moment — nothing has
                  been submitted.
                </p>
              ) : (
                <p>
                  {(submitError?.titles || soldItems.map((item) => item.title)).join(', ')}{' '}
                  {(submitError?.titles || soldItems).length === 1 ? 'has' : 'have'} found a home and
                  can no longer be ordered. Please{' '}
                  <Link to="/cart" className="checkout-alert__link">
                    remove it from your cart
                  </Link>{' '}
                  to continue.
                </p>
              )}
            </div>
          )}

          <fieldset className="checkout-section">
            <legend className="checkout-section__title">Your details</legend>

            <Field
              id="co-name"
              label="Full name"
              name="name"
              type="text"
              autoComplete="name"
              value={values.name}
              onChange={setField('name')}
              onBlur={handleBlur('name')}
              error={errors.name}
              required
            />
            <Field
              id="co-phone"
              label="Mobile number"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={values.phone}
              onChange={setField('phone')}
              onBlur={handleBlur('phone')}
              hint="Pakistani mobile: 03xx xxxxxxx or +92 3xx xxxxxxx."
              error={errors.phone}
              required
            />
            <Field
              id="co-email"
              label="Email"
              optional
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={values.email}
              onChange={setField('email')}
              onBlur={handleBlur('email')}
              error={errors.email}
            />
          </fieldset>

          <fieldset className="checkout-section">
            <legend className="checkout-section__title">Delivery address</legend>

            <Field
              id="co-city"
              label="City"
              name="city"
              type="text"
              autoComplete="address-level2"
              value={values.city}
              onChange={setField('city')}
              onBlur={handleBlur('city')}
              error={errors.city}
              required
            />
            <Field
              id="co-address"
              label="Full address"
              name="address"
              multiline
              rows={3}
              autoComplete="street-address"
              value={values.address}
              onChange={setField('address')}
              onBlur={handleBlur('address')}
              error={errors.address}
              required
            />
            <Field
              id="co-notes"
              label="Order notes"
              optional
              name="notes"
              multiline
              rows={3}
              value={values.notes}
              onChange={setField('notes')}
            />
          </fieldset>

          <fieldset className="checkout-section">
            <legend className="checkout-section__title">Payment method</legend>
            <div className="checkout-pay">
              {PAYMENT_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`checkout-pay__option ${payment === option.value ? 'checkout-pay__option--active' : ''}`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value={option.value}
                    checked={payment === option.value}
                    onChange={() => setPayment(option.value)}
                    className="checkout-pay__radio"
                  />
                  <span className="checkout-pay__label">{option.label}</span>
                </label>
              ))}
            </div>
            {payment === 'bank' && siteCopy.bankTransferNote && (
              <p className="checkout-pay__note">{siteCopy.bankTransferNoteText}</p>
            )}
          </fieldset>

          <button
            type="submit"
            className="btn btn--gilded checkout-form__submit"
            disabled={submitting}
            aria-busy={submitting}
          >
            {submitting ? (
              <>
                <span className="checkout-spinner" aria-hidden="true" />
                <span>PLACING ORDER…</span>
              </>
            ) : (
              <>
                <span>PLACE ORDER</span>
                <span className="btn__arrow" aria-hidden="true">→</span>
              </>
            )}
          </button>
        </form>

        <aside className="checkout-summary" aria-label="Order summary">
          <h2 className="checkout-summary__title">Order summary</h2>

          <ul className="checkout-summary__list" role="list">
            {items.map((item) => {
              const sold = isItemSold(item)
              return (
                <li
                  key={item.id || item.slug}
                  className={`checkout-summary__item ${sold ? 'checkout-summary__item--sold' : ''}`}
                >
                  <span className="checkout-summary__thumb">
                    <img
                      src={item.images?.[0] || '/placeholders/placeholder-01.svg'}
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
                    {sold && <span className="checkout-summary__sold">SOLD · Excluded from total</span>}
                  </span>
                  <span
                    className={`checkout-summary__price ${sold ? 'checkout-summary__price--sold' : ''}`}
                  >
                    {formatPKR(item.price)}
                  </span>
                </li>
              )
            })}
          </ul>

          <div className="checkout-summary__total">
            <span className="checkout-summary__total-label">Total</span>
            <span className="checkout-summary__total-value">{formatPKR(totalPKR)}</span>
          </div>

          <Link to="/cart" className="checkout-summary__edit">
            ← Edit cart
          </Link>
          {availableItems.length === 0 && (
            <p className="checkout-summary__empty-note">No orderable works remain in your cart.</p>
          )}
        </aside>
      </div>
    </main>
  )
}
