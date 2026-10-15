import { useLayoutEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Nav from './Nav'
import Footer from './Footer'
import PageTransition from './PageTransition'
import CuratorTrigger from './curator/CuratorTrigger'
import CuratorDrawer from './curator/CuratorDrawer'
import useSmoothScroll from '../hooks/useSmoothScroll'
import { scrollToTop } from '../utils/scroll'
import '../styles/curator.css'

export default function Layout() {
  const { pathname } = useLocation()
  const [curatorOpen, setCuratorOpen] = useState(false)
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
      {/* Global Ambient Gallery Depth Backdrop across all pages */}
      <div className="app__ambient-backdrop" aria-hidden="true">
        <div className="app__ambient-art" />
        <div className="app__ambient-scrim" />
      </div>
      <div id="page-content" className="app__content">
        <main id="main-content" className="app__main" tabIndex={-1}>
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
        <Footer />
      </div>

      {/* The Atelier Curator — AI Art Advisory */}
      <CuratorTrigger
        isOpen={curatorOpen}
        onClick={() => setCuratorOpen((prev) => !prev)}
      />
      <CuratorDrawer
        isOpen={curatorOpen}
        onClose={() => setCuratorOpen(false)}
      />
    </div>
  )
}
