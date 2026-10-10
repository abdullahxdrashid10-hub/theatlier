import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { NAV_LINKS } from '../data/navLinks'
import useScrolled from '../hooks/useScrolled'
import useFocusTrap from '../hooks/useFocusTrap'
import { lockScroll } from '../utils/scroll'

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M5 8h14l-1.1 12H6.1L5 8Z" />
      <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
    </svg>
  )
}

const MENU_QUERY = '(min-width: 768px)'

export default function Nav() {
  const location = useLocation()
  const scrolled = useScrolled(40)
  const [open, setOpen] = useState(false)
  const [seenKey, setSeenKey] = useState(location.key)
  const shellRef = useRef(null)

  // Close the menu whenever the route changes (adjusting state during render).
  if (seenKey !== location.key) {
    setSeenKey(location.key)
    setOpen(false)
  }

  const close = useCallback(() => setOpen(false), [])
  useFocusTrap(shellRef, open, close)

  // Freeze page scroll and hide the page from assistive tech while the menu is open.
  useEffect(() => {
    lockScroll(open)
    const page = document.getElementById('page-content')
    if (page) page.inert = open
    return () => {
      lockScroll(false)
      if (page) page.inert = false
    }
  }, [open])

  // Never leave the menu open if the viewport grows into the desktop layout.
  useEffect(() => {
    const mql = window.matchMedia(MENU_QUERY)
    const onChange = (event) => {
      if (event.matches) setOpen(false)
    }
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return (
    <div ref={shellRef}>
      <header className="nav" data-scrolled={scrolled} data-menu-open={open}>
        <div className="nav__inner">
          <Link to="/" className="nav__brand wordmark" aria-label="The Atelier by SK — home">
            <img src="/logo.png" alt="" className="nav__logo" width="34" height="34" />
            <span className="nav__brand-text">THE ATELIER BY SK</span>
          </Link>

          <div className="nav__right">
            <nav className="nav__links" aria-label="Primary">
              {NAV_LINKS.map((link) => (
                <NavLink key={link.to} to={link.to} end={link.end} className="nav__link">
                  {link.label}
                </NavLink>
              ))}
            </nav>

            <Link to="/cart" className="nav__icon-btn" aria-label="Cart">
              <CartIcon />
            </Link>

            <button
              type="button"
              className="nav__icon-btn nav__toggle"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              aria-controls="mobile-menu"
              onClick={() => setOpen((value) => !value)}
            >
              <span className="nav__toggle-bar" />
              <span className="nav__toggle-bar" />
            </button>
          </div>
        </div>
      </header>

      <div
        id="mobile-menu"
        className="mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        data-open={open}
        aria-hidden={!open}
        inert={!open}
      >
        <nav aria-label="Mobile">
          <ul className="mobile-menu__list">
            {NAV_LINKS.map((link, index) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  end={link.end}
                  className="mobile-menu__link"
                  data-autofocus={index === 0 ? '' : undefined}
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  )
}
