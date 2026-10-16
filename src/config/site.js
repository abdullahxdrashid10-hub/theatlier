/**
 * Site-wide configuration and external integration helpers.
 */

export const WHATSAPP_NUMBER = '+923002105846'
export const PHONE = '+92 300 2105846'
export const EMAIL = 'theatelierbysk@gmail.com'
export const INSTAGRAM_HANDLE = 'the.atelier.by.sk'

/** True when a configured value is still a TODO placeholder. */
export const isTodoValue = (value) => !value || String(value).includes('TODO')

/**
 * Builds a tel: link for the studio telephone.
 * @returns {string}
 */
export function buildTelHref() {
  if (isTodoValue(PHONE)) return '#'
  const clean = PHONE.replace(/[^\d+]/g, '')
  return `tel:${clean}`
}

/**
 * Builds a mailto: link with optional prefilled subject.
 * @param {string} [subject]
 * @returns {string}
 */
export function buildMailtoHref(subject) {
  if (isTodoValue(EMAIL)) return '#'
  const query = subject ? `?subject=${encodeURIComponent(subject)}` : ''
  return `mailto:${EMAIL}${query}`
}

/**
 * Builds a direct Instagram URL, stripping any leading @.
 * @returns {string}
 */
export function buildInstagramUrl() {
  if (isTodoValue(INSTAGRAM_HANDLE)) return '#'
  const handle = String(INSTAGRAM_HANDLE).replace(/^@/, '')
  return `https://instagram.com/${handle}`
}

/**
 * Builds a wa.me URL for arbitrary messages or visitor enquiries.
 * Reuses existing wa.me logic.
 *
 * @param {object} [params]
 * @param {string} [params.name]
 * @param {string} [params.message]
 * @param {string} [params.text]
 * @returns {{ href: string, isConfigured: boolean, warning?: string, toString: () => string }}
 */
export function buildWhatsAppMessage({ name, message, text } = {}) {
  const isConfigured = !isTodoValue(WHATSAPP_NUMBER)
  if (!isConfigured) {
    return {
      href: '#',
      isConfigured: false,
      warning: 'WhatsApp number is not configured.',
      toString() {
        return '#'
      },
    }
  }

  const cleanNumber = WHATSAPP_NUMBER.replace(/[^0-9]/g, '')
  let msg = text || ''
  if (!msg) {
    if (name && message) {
      msg = `Hello, my name is ${name}. ${message}`
    } else if (name) {
      msg = `Hello, my name is ${name}.`
    } else if (message) {
      msg = message
    }
  }

  const query = msg ? `?text=${encodeURIComponent(msg)}` : ''
  const href = `https://wa.me/${cleanNumber}${query}`

  return {
    href,
    isConfigured: true,
    toString() {
      return href
    },
  }
}

/**
 * Builds a WhatsApp enquiry link for a painting.
 *
 * @param {object} params
 * @param {string} params.title - Title of the artwork
 * @param {string} [params.url] - Direct URL to the painting detail page
 * @returns {{ href: string, isConfigured: boolean, warning?: string }}
 */
export function buildWhatsAppEnquiry({ title, url }) {
  const isConfigured = !isTodoValue(WHATSAPP_NUMBER)
  const currentUrl =
    url || (typeof window !== 'undefined' ? window.location.href : '')
  const text = `Hello, I would like to enquire about the artwork "${title}"${currentUrl ? ` (${currentUrl})` : ''}.`

  if (!isConfigured) {
    return {
      href: '#',
      isConfigured: false,
      warning:
        'WhatsApp enquiry is disabled: WHATSAPP_NUMBER is currently set to TODO_CLIENT_NUMBER.',
    }
  }

  const cleanNumber = WHATSAPP_NUMBER.replace(/[^0-9]/g, '')
  return {
    href: `https://wa.me/${cleanNumber}?text=${encodeURIComponent(text)}`,
    isConfigured: true,
  }
}

// TODO CLIENT: confirm with SK (footer contact line: email, phone, WhatsApp or Instagram text).
// While the value contains TODO, the footer Contact block is not rendered.
export const CONTACT_LINE = 'TODO_CLIENT_CONTACT'
