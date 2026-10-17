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

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)', flexWrap: 'wrap', width: '100%', gridColumn: '1 / -1', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--line)' }}>
          <p className="footer__legal" style={{ margin: 0 }}>&copy; The Atelier by SK</p>
          <Link to="/admin" className="footer__link" style={{ opacity: 0.45, fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Studio Portal
          </Link>
        </div>
      </div>
    </footer>
  )
}
