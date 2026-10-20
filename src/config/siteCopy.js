/**
 * Site copy and unverified claims configuration.
 * All claims regarding framing, shipping, authenticity, provenance, and materials
 * must be confirmed by the client (SK) before being displayed on the storefront.
 */

// Client public Instagram bio notes
export const showCommissionNote = true
export const commissionNote = 'Commissions by enquiry. Message us on WhatsApp or Instagram.'
export const commissionNoteText = 'Commissions by enquiry. Message us on WhatsApp or Instagram.'

export const showWorldwideShippingNote = true
export const worldwideShippingNote = 'Shipping worldwide.'
export const worldwideShippingNoteText = 'Shipping worldwide.'

// TODO CLIENT: confirm with SK
export const showFramingShippingNote = false

// TODO CLIENT: confirm with SK
export const showAuthenticityDetails = false

// TODO CLIENT: confirm with SK
export const showShippingAccordion = false

// TODO CLIENT: confirm with SK
export const showMaterialsClaims = false

// TODO CLIENT: confirm with SK
export const framingShippingNote = 'Original painting on canvas · Shipping worldwide'

// TODO CLIENT: confirm with SK
export const authenticitySpec = 'Handmade original'

// TODO CLIENT: confirm with SK
export const materialsClaims =
  'Handmade paintings created using acrylic paints on canvas, working with brushes and palette knives.'

// TODO CLIENT: confirm with SK
export const authenticityDossier = {
  title: 'Original Artwork',
  intro:
    'Original paintings from The Atelier by SK:',
  items: [
    'Handmade original work on canvas.',
    'Created with brushes and palette knives.',
  ],
}

// TODO CLIENT: confirm with SK
export const shippingDetails = {
  title: 'Shipping & Delivery',
  intro:
    'Every artwork is prepared with care for safe delivery:',
  items: [
    'Carefully packaged for transit.',
    'Shipping worldwide.',
  ],
}

// TODO CLIENT: confirm with SK (neutral terms with no factual claims about materials or editions)
export const studioIntroText =
  'Every work at The Atelier is a hands-on creative process, made with care to bring beauty, character, and individuality into your home. Paintings are created using acrylic paints on canvas, working with brushes and palette knives to bring art and words together in unique, expressive pieces.'

// Bank transfer details (Easypaisa)
export const bankTransferNote = true
export const bankTransferNoteText =
  'Transfer the order total to our Easypaisa account and share your payment receipt on WhatsApp with your Order Reference.'

export const bankTransferDetails = {
  service: 'Easypaisa',
  accountTitle: 'Samia Khalid',
  accountNumber: '03362297600',
  instructions:
    'Transfer via Easypaisa or any bank app / Raast to 03362297600. After placing your order, kindly share the payment screenshot on WhatsApp with your Order Reference.',
}

export const siteCopy = {
  showCommissionNote,
  commissionNote,
  commissionNoteText,
  showWorldwideShippingNote,
  worldwideShippingNote,
  worldwideShippingNoteText,
  bankTransferNote,
  bankTransferNoteText,
  bankTransferDetails,
  showFramingShippingNote,
  showAuthenticityDetails,
  showShippingAccordion,
  showMaterialsClaims,
  framingShippingNote,
  authenticitySpec,
  materialsClaims,
  authenticityDossier,
  shippingDetails,
  studioIntroText,
}

export default siteCopy
