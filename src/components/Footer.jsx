import { Link } from 'react-router-dom'
import { NAV_LINKS } from '../data/navLinks'

export default function Footer() {
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

        <div>
          <h2 className="footer__heading">Contact</h2>
          <p className="footer__contact">
            <span className="footer__todo">TODO</span> — contact details (email, phone, WhatsApp,
            Instagram) to be supplied by the client.
          </p>
        </div>

        <p className="footer__legal">&copy; The Atelier by SK</p>
      </div>
    </footer>
  )
}
