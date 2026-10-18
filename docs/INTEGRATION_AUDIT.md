# Integration Audit: The Atelier by SK

Date: 2026-10-18
Branch: integration

---

## 1. Reads Catalog or Order Data from Outside Supabase
- **`src/data/api.js`**:
  - `getLocalCatalog()`: Reads catalog from `localStorage` under key `the_atelier_catalog_store_v2` with fallback to `mockPaintings` from `src/data/paintings.js`.
  - `getLocalOrders()`: Reads orders from `localStorage` under key `the_atelier_orders_store`.
  - `getAllPaintings()`: Falls back to `getLocalCatalog()` when `VITE_USE_MOCK_DATA === 'true'`, when Supabase is unconfigured, or on query error.
  - `getPaintingBySlug()`: Falls back to `getLocalCatalog()` on mock mode, unconfigured client, or query error.
  - `getPaintingsByIds()`: Falls back to `getLocalCatalog()` on mock mode, unconfigured client, or query error.
  - `getAllOrders()`: Falls back to `getLocalOrders()` from `localStorage`.
- **`src/data/paintings.js`**:
  - Contains mock and placeholder painting records used as offline data.
- **`src/data/cartStore.js`**:
  - Reads saved cart items from `localStorage` under key `the_atelier_cart`.

---

## 2. Writes Data Anywhere Other Than Through `supabase/schema.sql` Rules
Under `supabase/schema.sql`, the public anon visitor has NO direct insert/update/delete permissions on `paintings`, `painting_images`, `orders`, or `order_items`. Orders must be created strictly via the database function `place_order(p_items, p_customer, p_payment_method)`.
The following locations bypass or violate these rules:
- **`src/data/api.js`**:
  - `saveLocalCatalog()`: Directly writes catalog objects to `localStorage`.
  - `saveLocalOrders()`: Directly writes orders to `localStorage`.
  - `updatePaintingStatus(id, newStatus)`: Directly modifies `localStorage` and attempts an unauthorized direct table update `supabase.from('paintings').update(...)`.
  - `createPainting(fields)`: Directly modifies `localStorage` and attempts direct table inserts into `paintings` and `painting_images`.
  - `updatePainting(id, fields)`: Directly modifies `localStorage` and attempts direct table updates on `paintings` and deletes/inserts on `painting_images`.
  - `deletePainting(id)`: Directly modifies `localStorage` and attempts direct table delete `supabase.from('paintings').delete()`.
  - `updateOrderStatus(orderId, newStatus)`: Directly modifies `localStorage` and attempts direct table update `supabase.from('orders').update()`.
  - `submitOrder(order)`: Creates an ad-hoc local order record, saves to `localStorage`, and calls `updatePaintingStatus(..., 'reserved')` directly instead of executing `rpc('place_order')`.
- **`src/pages/Admin.jsx`**:
  - Directly triggers the unsanctioned `createPainting`, `updatePainting`, `deletePainting`, `updateOrderStatus`, and `updatePaintingStatus` methods.

---

## 3. Hardcoded Passwords, Passcodes, or Credentials
- **`src/config/site.js`**:
  - Hardcodes default passcode fallback: `export const ADMIN_PASSCODE = import.meta.env.VITE_ADMIN_PASSCODE || 'atelier2026'`.
- **`src/pages/Admin.jsx`**:
  - Compares user input directly against `ADMIN_PASSCODE` in memory and sets a `sessionStorage` flag (`atelier_admin_auth = 'true'`) without server-side authentication.
- **`.env.local`**:
  - Contains local development credentials (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`). Must ensure `.env.local` remains git-ignored and no secrets or keys are committed or exposed in code.

---

## 4. Unverified Claims / Facts Outside the Allowed List
Allowed material facts:
- "Acrylic on canvas"
- "Mixed media on canvas" (or "Mixed media")
- "Textured calligraphy on canvas" (or "Textured calligraphy")
- "Brushes and palette knives"
- "Commercially available canvases"
- "Commissions by enquiry"
- "Shipping worldwide"

Found unverified claims / disallowed phrasing:
- **`src/config/siteCopy.js`**:
  - `framingShippingNote`: "Inclusive of bespoke museum framing & shipping" (Unverified claim).
  - `authenticitySpec`: "Signed verso by artist" (Unverified claim).
  - `materialsClaims`: References "archival Belgian canvas", "champagne and antique gold mineral pigments", "sculptural ridges", "heavy palette-knife impasto" (Unverified claim).
  - `authenticityDossier`: References "Embossed Certificate of Authenticity individually signed and sealed", "Archival catalog reference number and provenance transfer dossier", "Artist signature and dating inscribed verso" (Unverified claim).
  - `shippingDetails`: References "White-Glove Shipping & Art Crating", "acid-free barrier wrap", "custom timber-reinforced exhibition crate", "insured courier delivery", "temperature-stable fine art freight" (Unverified claim).
  - `studioIntroText`: Mentions "sculpted with the palette knife", "tactile crests and ridges that catch the shifting daylight" (Outside allowed phrasing).
- **`src/pages/About.jsx` & `src/components/about/*`**:
  - Entire suite (`AboutHero.jsx`, `AboutStatement.jsx`, `AboutCraftDuel.jsx`, `AboutPhilosophy.jsx`, `AboutSalonCTA.jsx`) contains extensive invented narratives regarding studio lineage, private viewings, bespoke Belgian canvas, museum framing, and provenance.
- **`src/data/paintings.js`**:
  - Artwork 1: Mentions "3D Relief Calligraphy & 24K Gold Leaf on Canvas", "organic dripping gold leaf canopy", "sacred elegance".
  - Artwork 2: Mentions "Heavy Impasto Palette Knife & 24K Gold Leaf on Canvas", "titanium white", "24K gold foil ridges".
  - Artwork 3 & 4: "Forthcoming Work III", "Forthcoming Work IV" (Placeholders).
- **`src/pages/Painting.jsx`**:
  - Descriptions and specs reference 24K gold leaf, sculptural impasto, museum framing, and provenance accordions.
- **`src/components/home/StudioIntro.jsx`**:
  - Quote: "Paint is not an illusion of light. It is light captured in physical relief."

---

## 5. AI-Generated Images & Mock Placeholders
The following image assets are AI-generated perspective renders or legacy placeholders:
- **Perspective Renders (`public/artworks/`)**:
  - `public/artworks/al-asr-angle.jpg`
  - `public/artworks/al-asr-detail.jpg`
  - `public/artworks/al-asr-room.jpg`
  - `public/artworks/gilded-ridge-angle.jpg`
  - `public/artworks/gilded-ridge-detail.jpg`
  - `public/artworks/gilded-ridge-room.jpg`
- **Mock Overlays & Hero Backdrop (`public/placeholders/`, `public/`)**:
  - `public/placeholders/mock-bronze-hour.jpg`
  - `public/placeholders/mock-ember-field.jpg`
  - `public/placeholders/mock-gilded-wake.jpg`
  - `public/placeholders/placeholder-01.svg` through `placeholder-12.svg`
  - `public/placeholders/placeholder-01-detail.svg` through `placeholder-12-detail.svg`
  - `public/hero-impasto.jpg` (AI-generated impasto surface)

---

## Conclusion & Plan for Phase 1
In Phase 1:
1. Delete hardcoded passcodes, `ADMIN_PASSCODE`, `sessionStorage` auth flag, `Admin.jsx`, and `admin.css`. Remove the `/admin` route temporarily.
2. Clean `src/data/api.js`: strip all localStorage helpers and unauthorized write functions. Restrict mock fallback strictly to `VITE_USE_MOCK_DATA === 'true' && import.meta.env.DEV`.
3. Delete `src/components/about/*` and rebuild `src/pages/About.jsx` strictly adhering to the exact allowed text.
4. Clean `src/data/paintings.js` and delete AI-generated files (`*-angle`, `*-detail`, `*-room`, `mock-*`, and unreferenced SVG placeholders). Retain only authentic client photos (`*-primary`).
5. Write idempotent `supabase/launch-catalog.sql`.
6. Remove unused hero files if any, and ensure public routing is secure and clean.
