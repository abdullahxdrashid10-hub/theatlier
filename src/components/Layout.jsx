import { useLayoutEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Nav from './Nav'
import Footer from './Footer'
import PageTransition from './PageTransition'
import useSmoothScroll from '../hooks/useSmoothScroll'
import { scrollToTop } from '../utils/scroll'

export default function Layout() {
  const { pathname } = useLocation()
  useSmoothScroll()

  // Reset scroll position on every route change.
  useLayoutEffect(() => {
    scrollToTop()
  }, [pathname])

  return (
    <div className="app">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <Nav />
      <div id="page-content" className="app__content">
        <main id="main-content" className="app__main" tabIndex={-1}>
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
        <Footer />
      </div>
    </div>
  )
}
