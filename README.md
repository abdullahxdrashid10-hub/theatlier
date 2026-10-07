# The Atelier by SK — Frontend

Luxury painting-studio storefront (Gallery Noir theme). This repo currently covers
**Milestone M1.1**: project setup, design tokens, routing, layout shell, smooth scroll and the
mock data layer. See `docs/` for the Build Plan and Design Brief (source of truth).

## Run it

Requires Node 20+.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build to /dist
npm run preview    # serve the production build
npm run lint       # ESLint
npm run placeholders  # regenerate /public/placeholders SVGs from src/data/paintings.js
```

## Structure

```
docs/                 Build Plan + Design Brief PDFs
public/placeholders/  Local SVG placeholder paintings (generated)
scripts/              generate-placeholders.mjs
src/
  components/         Layout, Nav (with mobile menu), Footer
  pages/              Placeholder route pages + 404
  data/               paintings.js (mock), api.js (Promise-based), navLinks.js
  hooks/              useSmoothScroll, useScrolled, useFocusTrap
  styles/             tokens.css (locked design tokens), global.css, layout.css
  utils/              formatPKR, scroll (Lenis registry)
```

## Notes

- **Tokens** live in `src/styles/tokens.css`. Colour values are locked by the Build Plan.
  Bronze is for borders/lines only, never text.
- **Data**: the UI must read paintings only through `src/data/api.js`
  (`getAllPaintings`, `getPaintingBySlug`, `getFeaturedPaintings`). They return Promises so
  Phase 2 can swap in a real API without touching the UI.
- **Placeholders**: all paintings and images are clearly marked placeholders.
- **Fonts** are self-hosted through `@fontsource` packages (no Google CDN).
