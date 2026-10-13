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

// TODO CLIENT: confirm with SK
export const materialsClaims =
  'Layered with heavy palette-knife impasto on archival Belgian canvas. The surface features sculptural ridges that capture natural and gallery light differently throughout the day, accentuated by subtle champagne and antique gold mineral pigments.'

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

// TODO CLIENT: confirm with SK (neutral terms with no factual claims about materials or editions)
export const studioIntroText =
  'Every work at The Atelier is sculpted with the palette knife. Rich pigments and textured strokes are applied with intention—creating tactile crests and ridges that catch the shifting daylight of your room. Each piece is singular and original.'

export const siteCopy = {
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
