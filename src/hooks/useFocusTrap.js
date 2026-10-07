import { useEffect } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Traps Tab focus inside `containerRef` while `active`, closes on Escape,
 * moves focus into the container on open and restores it on close.
 *
 * Elements marked [data-autofocus] receive initial focus (else the first focusable).
 */
export default function useFocusTrap(containerRef, active, onEscape) {
  useEffect(() => {
    if (!active) return undefined
    const container = containerRef.current
    if (!container) return undefined

    const previouslyFocused = document.activeElement

    const getFocusable = () =>
      [...container.querySelectorAll(FOCUSABLE)].filter((el) => el.getClientRects().length > 0)

    const initial = container.querySelector('[data-autofocus]') ?? getFocusable()[0]
    initial?.focus()

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onEscape?.()
        return
      }
      if (event.key !== 'Tab') return

      const items = getFocusable()
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      const current = document.activeElement
      const inside = container.contains(current)

      if (event.shiftKey && (current === first || !inside)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (current === last || !inside)) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()
    }
  }, [containerRef, active, onEscape])
}
