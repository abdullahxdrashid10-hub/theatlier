import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { getAllPaintings, getPaintingsByIds, submitOrder } from '../data/api'
import { clearCart, getCartItems, subscribeToCart } from '../utils/cartStorage'
import { formatPKR } from '../utils/formatPKR'
import { formatPKPhone, normalisePKPhone } from '../utils/phone'
import { saveOrderSummary } from '../utils/orderSession'
import siteCopy from '../config/siteCopy'
import { buildWhatsAppMessage } from '../config/site'
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
  if (values.address.trim().length < 5) errors.address = 'Please enter your full address.'
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
  const [dbItemsMap, setDbItemsMap] = useState({})
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

  // Refetch cart's paintings with getPaintingsByIds as source of truth
  useEffect(() => {
    let active = true
    const ids = items.map((i) => i.id).filter(Boolean)
    if (ids.length === 0) return

    getPaintingsByIds(ids)
      .then((records) => {
        if (!active) return
        const map = {}
        records.forEach((p) => {
          if (p.id) map[p.id] = p
        })
        setDbItemsMap(map)
      })
      .catch((err) => {
        console.error('Failed to sync checkout paintings with DB:', err)
      })

    return () => {
      active = false
    }
  }, [items])

  // Move focus to the error message whenever a submit error appears
  useEffect(() => {
    if (submitError) errorRef.current?.focus()
  }, [submitError])

  const getItemRecord = useCallback(
    (item) => dbItemsMap[item.id] || {},
    [dbItemsMap]
  )

  const isItemUnavailable = useCallback(
    (item) => {
      const db = getItemRecord(item)
      if (!db.id) return false
      const status = String(db.status || 'available').toLowerCase()
      return status === 'sold' || status === 'reserved'
    },
    [getItemRecord]
  )

  const getItemPrice = useCallback(
    (item) => {
      const db = getItemRecord(item)
      return typeof db.price === 'number' ? db.price : 0
    },
    [getItemRecord]
  )

  const { unavailableItems, availableItems, totalPKR } = useMemo(() => {
    const unavailable = items.filter(isItemUnavailable)
    const available = items.filter((item) => !isItemUnavailable(item))
    return {
      unavailableItems: unavailable,
      availableItems: available,
      totalPKR: available.reduce((sum, item) => sum + getItemPrice(item), 0),
    }
  }, [items, isItemUnavailable, getItemPrice])

  const setField = (name) => (e) => {
    const { value } = e.target
    setValues((prev) => ({ ...prev, [name]: value }))
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

    const current = getCartItems()
    const ids = current.map((i) => i.id).filter(Boolean)

    try {
      const freshRecords = await getPaintingsByIds(ids)
      const freshMap = {}
      freshRecords.forEach((p) => {
        if (p.id) freshMap[p.id] = p
      })
      setDbItemsMap(freshMap)

      const badItems = current.filter((item) => {
        const match = freshMap[item.id]
        if (!match) return false
        const st = String(match.status || 'available').toLowerCase()
        return st === 'sold' || st === 'reserved'
      })

      if (badItems.length > 0) {
        setSubmitError({
          kind: 'unavailable',
          message: 'One or more items in your cart are no longer available. Please remove them to proceed.',
        })
        setSubmitting(false)
        return
      }

      const normalisedPhone = normalisePKPhone(values.phone)
      if (!normalisedPhone) {
        setErrors((prev) => ({
          ...prev,
          phone: 'Enter a valid Pakistani mobile number (+923XXXXXXXXX).',
        }))
        setSubmitting(false)
        return
      }

      const result = await submitOrder({
        items: ids,
        customer: {
          name: values.name.trim(),
          phone: normalisedPhone,
          email: values.email.trim() || null,
          city: values.city.trim(),
          address: values.address.trim(),
          notes: values.notes.trim() || null,
        },
        paymentMethod: payment === 'bank' ? 'bank_transfer' : 'cod',
      })

      // Store only { reference, items, total, method } in sessionStorage
      saveOrderSummary({
        reference: result.reference,
        items: result.items,
        total: result.total_pkr,
        method: payment,
      })

      clearCart()
      setDone(true)
      navigate('/order-confirmation', { replace: true })
    } catch (err) {
      console.error('Order submission error:', err)

      const isNetworkError =
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        err.name === 'AbortError' ||
        String(err.message || '').toLowerCase().includes('network') ||
        String(err.message || '').toLowerCase().includes('fetch')

      if (isNetworkError) {
        setSubmitError({
          kind: 'network',
          message:
            'If you received an order reference, please do not submit again; contact the studio on WhatsApp.',
        })
      } else {
        const code = String(err.code || err.message || '')
        const detail = String(err.details || '').toLowerCase()

        if (code === 'ATL03' || code.includes('PAINTING_UNAVAILABLE')) {
          getAllPaintings({ force: true }).catch(() => {})
          getPaintingsByIds(ids).then((records) => {
            const map = {}
            records.forEach((p) => { if (p.id) map[p.id] = p })
            setDbItemsMap(map)
          }).catch(() => {})
          setSubmitError({
            kind: 'unavailable',
            message:
              'An artwork in your cart was just reserved or sold. Please remove it from your selection.',
          })
        } else if (
          code === 'ATL02' ||
          code.includes('INVALID_CUSTOMER') ||
          code.includes('INVALID_PAYMENT_METHOD')
        ) {
          if (detail && FIELD_ORDER.includes(detail)) {
            setErrors((prev) => ({
              ...prev,
              [detail]: 'Please verify this information before submitting.',
            }))
            document.getElementById(`co-${detail}`)?.focus()
          } else {
            setSubmitError({
              kind: 'invalid_customer',
              message: 'Please review your contact details and try again.',
            })
          }
        } else if (code === 'ATL04' || code.includes('RATE_LIMITED')) {
          setSubmitError({
            kind: 'rate_limited',
            message: 'Please try again shortly.',
          })
        } else {
          setSubmitError({
            kind: 'generic',
            message:
              'We were unable to complete your order. Please try again shortly or contact the studio.',
          })
        }
      }
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
        <p className="checkout-page__intl-note">
          Ordering from outside Pakistan?{' '}
          <a
            href={buildWhatsAppMessage({ message: 'Hello, I am ordering from outside Pakistan and would like to enquire about acquiring artwork.' }).href}
            target="_blank"
            rel="noopener noreferrer"
            className="checkout-page__intl-link"
          >
            Enquire on WhatsApp.
          </a>
        </p>
      </header>

      <div className="checkout-layout">
        <form className="checkout-form" onSubmit={handleSubmit} noValidate aria-label="Checkout">
          {(unavailableItems.length > 0 || submitError) && (
            <div
              ref={errorRef}
              tabIndex={-1}
              className="checkout-alert"
              role="status"
              aria-live="polite"
            >
              {submitError ? (
                <p>{submitError.message}</p>
              ) : (
                <p>
                  {unavailableItems.map((item) => getItemRecord(item).title || 'An artwork').join(', ')}{' '}
                  {unavailableItems.length === 1 ? 'is' : 'are'} currently unavailable (sold or reserved) and
                  cannot be ordered. Please{' '}
                  <Link to="/cart" className="checkout-alert__link">
                    remove from your cart
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
            disabled={submitting || unavailableItems.length > 0 || availableItems.length === 0}
            aria-busy={submitting}
          >
            {submitting ? (
              <>
                <span className="checkout-spinner" aria-hidden="true" />
                <span>PLACING ORDER…</span>
              </>
            ) : unavailableItems.length > 0 ? (
              <span>REMOVE UNAVAILABLE ITEMS TO ORDER</span>
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
              const db = getItemRecord(item)
              const status = String(db.status || 'available').toLowerCase()
              const isSold = status === 'sold'
              const isReserved = status === 'reserved'
              const isUnavailable = isSold || isReserved
              const title = db.title || 'Artwork'
              const medium = db.medium || 'Original Artwork'
              const widthCm = db.widthCm || ''
              const heightCm = db.heightCm || ''
              const imageSrc = db.images?.[0] || ''
              const price = getItemPrice(item)

              return (
                <li
                  key={item.id}
                  className={`checkout-summary__item ${isSold ? 'checkout-summary__item--sold' : ''} ${isReserved ? 'checkout-summary__item--reserved' : ''}`}
                >
                  {imageSrc && (
                    <span className="checkout-summary__thumb">
                      <img
                        src={imageSrc}
                        alt=""
                        width="64"
                        height="48"
                        loading="lazy"
                      />
                    </span>
                  )}
                  <span className="checkout-summary__info">
                    <span className="checkout-summary__name">{title}</span>
                    <span className="checkout-summary__meta">
                      {medium} {widthCm && heightCm ? `— ${widthCm} × ${heightCm} cm` : ''}
                    </span>
                    {isSold && (
                      <span className="checkout-summary__sold">SOLD · Excluded from total</span>
                    )}
                    {isReserved && (
                      <span className="checkout-summary__sold">RESERVED · Excluded from total</span>
                    )}
                  </span>
                  <span
                    className={`checkout-summary__price ${isUnavailable ? 'checkout-summary__price--sold' : ''}`}
                  >
                    {formatPKR(price)}
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
