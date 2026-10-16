import { Link } from 'react-router-dom'
import { NAV_LINKS } from '../data/navLinks'
import {
  PHONE,
  EMAIL,
  INSTAGRAM_HANDLE,
  isTodoValue,
  buildTelHref,
  buildMailtoHref,
  buildInstagramUrl,
} from '../config/site'

export default function Footer() {
  const hasPhone = !isTodoValue(PHONE)
  const hasEmail = !isTodoValue(EMAIL)
  const hasInstagram = !isTodoValue(INSTAGRAM_HANDLE)
  const hasContact = hasPhone || hasEmail || hasInstagram

  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__brand">
          <Link to="/" className="wordmark" aria-label="The Atelier by SK — home">
            THE ATELIER BY SK
          </Link>
          <p className="footer__tagline">Art lives here</p>
        </div>

        <nav aria-label="Footer">
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
            <h2 className="footer__heading">Contact</h2>
            <ul className="footer__links">
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

        <p className="footer__legal">&copy; The Atelier by SK</p>
      </div>
    </footer>
  )
}
