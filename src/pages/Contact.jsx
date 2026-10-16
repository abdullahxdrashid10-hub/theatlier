import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  PHONE,
  EMAIL,
  INSTAGRAM_HANDLE,
  isTodoValue,
  buildTelHref,
  buildMailtoHref,
  buildInstagramUrl,
  buildWhatsAppMessage,
} from '../config/site'
import siteCopy from '../config/siteCopy'
import { getPaintingBySlug } from '../data/api'
import '../styles/contact.css'

export default function Contact() {
  const [searchParams] = useSearchParams()
  const paintingSlug = searchParams.get('painting')

  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState({})

  // Support ?painting=<slug> to prefill the message with the painting's title
  useEffect(() => {
    if (!paintingSlug) return
    let active = true

    getPaintingBySlug(paintingSlug)
      .then((painting) => {
        if (!active || !painting) return
        setMessage((prev) => (prev ? prev : `Regarding "${painting.title}": `))
      })
      .catch(() => {
        if (!active) return
        const cleanTitle = paintingSlug
          .replace(/^(placeholder-)/, '')
          .replace(/-/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase())
        setMessage((prev) => (prev ? prev : `Regarding "${cleanTitle}": `))
      })

    return () => {
      active = false
    }
  }, [paintingSlug])

  const handleSubmit = (e) => {
    e.preventDefault()
    const newErrors = {}
    if (!name.trim()) {
      newErrors.name = 'Please enter your name.'
    }
    if (!message.trim()) {
      newErrors.message = 'Please enter a message.'
    }
    setErrors(newErrors)

    if (Object.keys(newErrors).length > 0) {
      return
    }

    const { href } = buildWhatsAppMessage({
      name: name.trim(),
      message: message.trim(),
    })

    if (typeof window !== 'undefined') {
      window.open(href, '_blank', 'noopener,noreferrer')
    }
  }

  const hasPhone = !isTodoValue(PHONE)
  const hasEmail = !isTodoValue(EMAIL)
  const hasInstagram = !isTodoValue(INSTAGRAM_HANDLE)

  return (
    <main className="contact-page">
      <title>Contact — The Atelier by SK</title>

      <header className="contact-page__header">
        <span className="contact-page__eyebrow">The Atelier by SK · Contact</span>
        <h1 className="contact-page__title">Contact</h1>
        <span className="contact-page__rule" aria-hidden="true" />
        <p className="contact-page__subtitle">
          Questions about a painting or a commission? Reach out.
        </p>
      </header>

      {/* Grid of Contact Cards */}
      <section className="contact-cards" aria-label="Direct studio channels">
        {/* WhatsApp Primary Card */}
        <a
          href={buildWhatsAppMessage().href}
          target="_blank"
          rel="noopener noreferrer"
          className="contact-card contact-card--whatsapp"
          aria-label="Message on WhatsApp"
        >
          <div>
            <span className="contact-card__label">WhatsApp</span>
            <p className="contact-card__value">Direct Studio Chat</p>
          </div>
          <div className="contact-card__badge-btn">
            <span>Message on WhatsApp</span>
            <span aria-hidden="true">→</span>
          </div>
        </a>

        {/* Call Card */}
        {hasPhone && (
          <a
            href={buildTelHref()}
            className="contact-card"
            aria-label={`Call the studio at ${PHONE}`}
          >
            <div>
              <span className="contact-card__label">Call</span>
              <p className="contact-card__value">{PHONE}</p>
            </div>
            <span className="contact-card__action">
              <span>Dial studio</span>
              <span aria-hidden="true">→</span>
            </span>
          </a>
        )}

        {/* Email Card */}
        {hasEmail && (
          <a
            href={buildMailtoHref('Enquiry — The Atelier by SK')}
            className="contact-card"
            aria-label={`Send email to ${EMAIL}`}
          >
            <div>
              <span className="contact-card__label">Email</span>
              <p className="contact-card__value">{EMAIL}</p>
            </div>
            <span className="contact-card__action">
              <span>Send email</span>
              <span aria-hidden="true">→</span>
            </span>
          </a>
        )}

        {/* Instagram Card */}
        {hasInstagram && (
          <a
            href={buildInstagramUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="contact-card"
            aria-label="Visit Instagram profile (opens in new tab)"
          >
            <div>
              <span className="contact-card__label">Instagram</span>
              <p className="contact-card__value">
                @{String(INSTAGRAM_HANDLE).replace(/^@/, '')}
              </p>
            </div>
            <span className="contact-card__action">
              <span>Visit profile</span>
              <span aria-hidden="true">↗</span>
            </span>
          </a>
        )}
      </section>

      {/* Commission Note & Worldwide Shipping Note */}
      {(siteCopy.showCommissionNote || siteCopy.showWorldwideShippingNote) && (
        <aside className="contact-page__notes" aria-label="Studio policies">
          {siteCopy.showCommissionNote && (
            <p className="contact-page__note">
              {siteCopy.commissionNote || siteCopy.commissionNoteText}
            </p>
          )}
          {siteCopy.showWorldwideShippingNote && (
            <p className="contact-page__note">
              {siteCopy.worldwideShippingNote || siteCopy.worldwideShippingNoteText}
            </p>
          )}
        </aside>
      )}

      {/* WhatsApp Direct Form */}
      <section className="contact-form-section" aria-labelledby="enquiry-form-title">
        <div className="contact-form-section__header">
          <h2 id="enquiry-form-title" className="contact-form-section__title">
            Direct Enquiry
          </h2>
          <p className="contact-form-section__desc">
            Enter your details below to continue directly to WhatsApp with your prefilled enquiry.
          </p>
        </div>

        <form className="contact-form" onSubmit={handleSubmit} noValidate>
          <div className={`contact-field ${errors.name ? 'contact-field--invalid' : ''}`}>
            <label htmlFor="contact-name" className="contact-field__label">
              Your Name
            </label>
            <input
              id="contact-name"
              name="name"
              type="text"
              className="contact-field__control"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (errors.name) setErrors((prev) => ({ ...prev, name: '' }))
              }}
              placeholder="e.g. Tariq Khan"
              autoComplete="name"
              aria-invalid={errors.name ? 'true' : undefined}
              aria-describedby={errors.name ? 'contact-name-error' : undefined}
            />
            {errors.name && (
              <p id="contact-name-error" className="contact-field__error" role="alert">
                {errors.name}
              </p>
            )}
          </div>

          <div className={`contact-field ${errors.message ? 'contact-field--invalid' : ''}`}>
            <label htmlFor="contact-message" className="contact-field__label">
              Message
            </label>
            <textarea
              id="contact-message"
              name="message"
              className="contact-field__control contact-field__control--textarea"
              value={message}
              onChange={(e) => {
                setMessage(e.target.value)
                if (errors.message) setErrors((prev) => ({ ...prev, message: '' }))
              }}
              rows={4}
              placeholder="How can SK assist with your space or commission?"
              aria-invalid={errors.message ? 'true' : undefined}
              aria-describedby={errors.message ? 'contact-message-error' : undefined}
            />
            {errors.message && (
              <p id="contact-message-error" className="contact-field__error" role="alert">
                {errors.message}
              </p>
            )}
          </div>

          <div className="contact-form__submit-wrap">
            <button type="submit" className="contact-form__submit">
              <span>Continue on WhatsApp</span>
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}
