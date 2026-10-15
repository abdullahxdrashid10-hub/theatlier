/**
 * Site copy and unverified claims configuration.
 * All claims regarding framing, shipping, authenticity, provenance, and materials
 * must be confirmed by the client (SK) before being displayed on the storefront.
 */

// TODO CLIENT: confirm with SK
export const showFramingShippingNote = false

// TODO CLIENT: confirm with SK
export const showAuthenticityDetails = false

// TODO CLIENT: confirm with SK
export const showShippingAccordion = false

// TODO CLIENT: confirm with SK
export const showMaterialsClaims = false

// TODO CLIENT: confirm with SK
export const framingShippingNote = 'Inclusive of bespoke museum framing & shipping'

// TODO CLIENT: confirm with SK
export const authenticitySpec = 'Signed verso by artist'

// Confirmed with SK: Acrylic on canvas, mixed media, and textured calligraphy
export const materialsClaims =
  'Each original artwork is hand-created using artist-grade acrylics, mixed media, and textured palette-knife techniques on canvas. Handcrafted with both delicate brushwork and expressive dimensional impasto, alongside sculptural calligraphy combining painted and relief techniques.'

// Confirmed with SK
export const studioIntroText =
  'Every artwork at The Atelier is a hands-on creative journey. Using brushes and palette knives, thick layers of acrylic and mixed media are sculpted into expressive textures and meaningful calligraphy—bringing warmth, emotion, and individuality into your home.'

// TODO CLIENT: confirm with SK
export const authenticityDossier = {
  title: 'Provenance & Certificate of Authenticity',
  intro:
    'Each original artwork from The Atelier is unique and recorded in the studio registry. Upon acquisition, the collector receives:',
  items: [
    'An embossed Certificate of Authenticity individually signed and sealed by the artist.',
    'Archival catalog reference number and provenance transfer dossier.',
    'Artist signature and dating inscribed verso on the canvas stretcher.',
  ],
}

// TODO CLIENT: confirm with SK
export const shippingDetails = {
  title: 'White-Glove Shipping & Art Crating',
  intro:
    'Due to the heavy sculptural impasto surface, this painting is prepared with specialised care:',
  items: [
    'Encased in an acid-free barrier wrap and custom timber-reinforced exhibition crate.',
    'Complimentary insured courier delivery across Pakistan (3–5 business days).',
    'Worldwide temperature-stable fine art freight options available upon inquiry.',
  ],
}

// TODO CLIENT: confirm with SK (flag: show a one-line note under the Bank transfer option)
export const bankTransferNote = false

// TODO CLIENT: confirm with SK (the single line shown when bankTransferNote is true; no bank details here)
export const bankTransferNoteText = 'TODO_CLIENT_BANK_TRANSFER_NOTE'

export const siteCopy = {
  bankTransferNote,
  bankTransferNoteText,
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
