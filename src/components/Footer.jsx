import { Link } from 'react-router-dom'
import { NAV_LINKS } from '../data/navLinks'

export default function Footer() {
  const handleOpenCurator = () => {
    window.dispatchEvent(
      new CustomEvent('atelier:open-curator', {
        detail: { prompt: 'I would like to inquire about an artwork or bespoke commission.' },
      })
    )
  }

  return (
    <footer className="footer" aria-label="The Atelier Footer">
      <div className="footer__glow" aria-hidden="true" />
      <div className="footer__inner">
        {/* Brand & Studio Heritage */}
        <div className="footer__brand">
          <Link to="/" className="footer__wordmark" aria-label="The Atelier by SK — home">
            THE ATELIER BY SK
          </Link>
          <span className="footer__tagline">Art lives here</span>
          <p className="footer__description">
            Original, one-of-one fine art handmade by SK with heavy palette-knife impasto, artist acrylics, and dimensional calligraphy.
          </p>
          <div className="footer__location">
            <span>Studio Sanctuary · Lahore & Karachi</span>
          </div>
        </div>

        {/* Gallery Navigation */}
        <nav className="footer__nav" aria-label="Gallery Navigation">
          <h3 className="footer__heading">The Gallery</h3>
          <ul className="footer__links">
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="footer__link">
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/about" className="footer__link">
                Studio Provenance
              </Link>
            </li>
          </ul>
        </nav>

        {/* Private Art Advisory & Curation */}
        <div className="footer__advisory">
          <h3 className="footer__heading">Private Advisory</h3>
          <p className="footer__advisory-text">
            Every acquisition includes an artist-signed Certificate of Authenticity and insured white-glove crating across Pakistan and internationally.
          </p>
          <button
            type="button"
            className="footer__curator-btn"
            onClick={handleOpenCurator}
          >
            <span className="footer__curator-icon" aria-hidden="true">✦</span>
            <span>Consult The Atelier Curator</span>
          </button>
        </div>
      </div>

      {/* Sub-Footer Legal & Standards Bar */}
      <div className="footer__bottom">
        <div className="footer__bottom-inner">
          <p className="footer__legal">&copy; {new Date().getFullYear()} The Atelier by SK. All rights reserved.</p>
          <span className="footer__craft">Handmade Originals · Strictly Zero Reproductions</span>
          <Link to="/contact" className="footer__inquire-link">
            Private Commissions & Inquiries →
          </Link>
        </div>
      </div>
    </footer>
  )
}
