/**
 * Tiny registry so components can talk to the Lenis instance (if one is running)
 * without prop-drilling. When Lenis is disabled (reduced motion) these fall back
 * to native scrolling.
 */
let lenis = null

export function setLenis(instance) {
  lenis = instance
}

export function scrollToTop() {
  if (lenis) {
    lenis.scrollTo(0, { immediate: true, force: true })
  } else {
    window.scrollTo(0, 0)
  }
}

/** Freeze / unfreeze page scroll (used by the mobile menu). */
export function lockScroll(locked) {
  document.documentElement.classList.toggle('menu-open', locked)
  if (!lenis) return
  if (locked) lenis.stop()
  else lenis.start()
}
