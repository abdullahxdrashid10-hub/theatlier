import { Link } from 'react-router-dom'
import { NAV_LINKS } from '../data/navLinks'
import {
  PHONE,
  EMAIL,
  INSTAGRAM_HANDLE,
  WHATSAPP_NUMBER,
  isTodoValue,
  buildTelHref,
  buildMailtoHref,
  buildInstagramUrl,
  buildWhatsAppMessage,
} from '../config/site'
import {
  showCommissionNote,
  commissionNote,
  showWorldwideShippingNote,
  worldwideShippingNote,
} from '../config/siteCopy'

export default function Footer() {
  const hasPhone = !isTodoValue(PHONE)
  const hasEmail = !isTodoValue(EMAIL)
  const hasInstagram = !isTodoValue(INSTAGRAM_HANDLE)
  const hasWhatsApp = !isTodoValue(WHATSAPP_NUMBER)
  const hasContact = hasPhone || hasEmail || hasInstagram || hasWhatsApp

  return (
    <footer className="footer" role="contentinfo">
      <div className="footer__inner">
        <div className="footer__brand">
          <Link to="/" className="wordmark" aria-label="The Atelier by SK — home">
            THE ATELIER BY SK
          </Link>
          <p className="footer__tagline">Art lives here</p>
          {(showCommissionNote || showWorldwideShippingNote) && (
            <p className="footer__note">
              {showCommissionNote && commissionNote}
              {showCommissionNote && showWorldwideShippingNote && ' · '}
              {showWorldwideShippingNote && worldwideShippingNote}
            </p>
          )}
        </div>

        <nav aria-label="Footer Navigation">
          <h2 className="footer__heading">Explore</h2>
          <ul className="footer__links">
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="footer__link">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {hasContact && (
          <div>
            <h2 className="footer__heading">Studio Inquiries</h2>
            <ul className="footer__links">
              {hasWhatsApp && (
                <li>
                  <a
                    href={buildWhatsAppMessage().href}
                    className="footer__link"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span>WhatsApp Direct</span>
                    <span className="footer__link-badge">Direct Chat</span>
                  </a>
                </li>
              )}
              {hasPhone && (
                <li>
                  <a href={buildTelHref()} className="footer__link">
                    {PHONE}
                  </a>
                </li>
              )}
              {hasEmail && (
                <li>
                  <a href={buildMailtoHref()} className="footer__link">
                    {EMAIL}
                  </a>
                </li>
              )}
              {hasInstagram && (
                <li>
                  <a
                    href={buildInstagramUrl()}
                    className="footer__link"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    @{String(INSTAGRAM_HANDLE).replace(/^@/, '')}
                  </a>
                </li>
              )}
            </ul>
          </div>
        )}

        <div className="footer__bottom">
          <p className="footer__legal">
            &copy; {new Date().getFullYear()} The Atelier by SK. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

