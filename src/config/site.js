/**
 * Site-wide configuration and external integration helpers.
 */

// TODO CLIENT: confirm with SK
export const WHATSAPP_NUMBER = 'TODO_CLIENT_NUMBER'

/**
 * Builds a WhatsApp enquiry link for a painting.
 *
 * @param {object} params
 * @param {string} params.title - Title of the artwork
 * @param {string} [params.url] - Direct URL to the painting detail page
 * @returns {{ href: string, isConfigured: boolean, warning?: string }}
 */
export function buildWhatsAppEnquiry({ title, url }) {
  const isConfigured =
    Boolean(WHATSAPP_NUMBER) &&
    WHATSAPP_NUMBER !== 'TODO_CLIENT_NUMBER' &&
    !WHATSAPP_NUMBER.includes('TODO')

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

/** True when a configured value is still a TODO placeholder. */
export const isTodoValue = (value) => !value || String(value).includes('TODO')

