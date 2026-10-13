# The Atelier Curator: Architecture & Implementation Plan
**Feature:** AI-Powered Private Art Advisory Concierge  
**Platform:** The Atelier by SK  
**Status:** Planning & Design Specification (Updated with Production Risk Defenses)  

---

## 1. Vision & Purpose

In a physical high-end art gallery (Mayfair, Manhattan, or Paris), collectors rarely browse in complete silence. A gallery director or curator greets them, listens to what kind of space they are designing, discusses how afternoon light strikes a particular canvas, and tells the story of the artist's palette knife technique.

**The Atelier Curator** brings this bespoke advisory experience directly to the website. It is not a robotic customer service bot; it is a **private art concierge** that:
1. **Understands nuanced collector intent** (room dimensions, mood, color harmony, emotional resonance).
2. **Recommends genuine works from the Atelier catalog** with live availability, dimensions, and prices in PKR.
3. **Educates visitors on SK's physical impasto technique**, materials (Belgian linen, heavy-body oil), and framing.
4. **Provides interactive rich artwork cards** right in the conversation with one-tap shortcuts to *"View Artwork"* and *"View on Wall"*.

---

## 2. Luxury Brand Persona & Guardrails

| Attribute | Specification |
| :--- | :--- |
| **Name** | *The Atelier Curator* (or *Curator's Desk*) |
| **Voice & Tone** | Cultured, warm, articulate, respectful, and visually evocative. Speaks with editorial elegance (Cormorant Garamond headers, crisp Inter body). |
| **Vocabulary** | Uses fine-art terminology naturally: *heavy-body impasto, palette knife relief, chiaroscuro, Belgian linen, organic geometry, provenance, tactile depth*. |
| **Currency** | Strictly whole integer PKR (e.g. `PKR 185,000`), consistent with the platform standard. |
| **Guardrails & Compliance** | Strictly adheres to `src/config/siteCopy.js`. Never invents unverified client policies, banking details, or false shipping promises. For custom commissions or bespoke acquisitions, directs collectors to the official studio WhatsApp or enquiry flow. |

---

## 3. Production Risk Defenses & Mitigations (Critical)

### 3.1. Defense Against "Hallucinated Inventory"
* **The Token Contract:** The system prompt instructs Gemini to **never** output raw prices, dimensions, or manual markup. When recommending a painting, it must *strictly* output the token format: `[artwork:slug]`.
* **Client-Side Deterministic Validation:**
  * When `CuratorDrawer.jsx` parses incoming messages, it intercepts all `[artwork:slug]` tokens.
  * It cross-references `slug` against the live local/database catalog (`src/data/paintings.js` / Supabase).
  * **Valid Slug:** Mounts the verified `<CuratorPaintingCard painting={realPainting} />`.
  * **Invalid/Hallucinated Slug:** Strips the broken token cleanly or falls back to a curated collection link. Phantom paintings *never* appear on the collector's screen.

### 3.2. Defense Against Serverless Timeouts & Cold Starts
* **Vercel Edge Runtime (`runtime: 'edge'`):** The `/api/curator.js` route runs on Cloudflare/Vercel Edge with zero Node.js cold-start latency (<50ms TTFB).
* **Token-by-Token Streaming (`ReadableStream`):** The response streams directly to the client as Gemini generates it, bypassing standard 10-second serverless execution limits.
* **Network Grace Fallback:** If the user’s connection drops, the UI shows a refined status:
  > *“The Curator’s connection is momentarily delayed. Please try again in a brief moment.”*

### 3.3. Defense Against Token-Limit Inflation (Compact Manifest)
* **Token-Optimized Catalog Schema:** The LLM is never fed raw image URLs, full descriptions, or database IDs. It receives a hyper-compressed JSON manifest (~350 tokens for 12 paintings):
  ```json
  [
    {"s":"ephemeral-horizon","t":"Ephemeral Horizon","p":185000,"d":"120x90cm","st":"available","tags":"bronze,gold,chiaroscuro,statement,lounge"}
  ]
  ```
* **Future RAG Scalability:** If the catalog exceeds 50 pieces, a lightweight similarity search fetches only the top 5 candidates before prompting Gemini.

### 3.4. Defense Against Language, Dialect & Currency Drift
* **Multi-Dialect Prompt Guard:**
  > *“You serve discerning collectors in Pakistan and internationally. Visitors may use English, Urdu, or Roman Urdu (e.g., ‘mujhay gold tone paintings dikhao’). Understand all dialects fluently, but respond in polished, editorial English (or courteous bilingual tone if addressed in Urdu).”*
* **Currency Formatting Invariant:**
  > *“Always express prices strictly in whole integer Pakistani Rupees formatted as `PKR 185,000`. Never use USD ($), never use ‘lacs’ or ‘k’ in official price mentions, and never use decimal points.”*

### 3.5. Defense Against Stale Price & Availability Desynchronization
* **Real-Time Client Re-Hydration:** The LLM's text snapshot does **not** control the card badge.
* When `<CuratorPaintingCard slug={slug} />` renders, it queries the live application state/database in real time.
* If a piece was purchased or reserved 5 minutes ago while the chat was open, the card displays **[Reserved]** or **[Sold]** with an *"Inquire on Commission"* button, overriding any stale LLM text.

---

## 4. UI / UX Design & Components

### 4.1. Floating Trigger (`CuratorTrigger.jsx`)
* **Position:** Fixed in bottom-right corner (`bottom: 2rem; right: 2rem; z-index: 40;`).
* **Aesthetic:** Minimalist dark bronze seal with subtle gold border (`#D0A971`), featuring a sculpted monogram emblem and an optional luxury pill label (*"Curator's Desk"*).
* **Hover Effect:** Gentle 3D depth elevation, subtle gold ambient sheen, and smooth micro-interaction.

### 4.2. Slide-Over Advisory Drawer (`CuratorDrawer.jsx`)
* **Layout:** Desktop slide-over panel (440px wide) or full-height mobile sheet.
* **Surface Aesthetic:** Gallery Noir frosted glass (`background: rgba(21, 20, 16, 0.94)`, `backdrop-filter: blur(16px)`, `border-left: 1px solid var(--line)`).
* **Header:**
  * Title: *"The Atelier Curator"*
  * Subhead: *"Private Art Advisory · Atelier by SK"*
  * Minimal gold close icon (`×`) and clear conversation button.

### 4.3. Welcome View & Starter Pills
When opened for the first time, the curator greets the visitor with an invitation to consult, accompanied by 4 one-tap starter pills:
* ✦ *"Recommend a statement piece for my living room"*
* ✦ *"Tell me about SK’s impasto knife technique"*
* ✦ *"Browse artworks in warm bronze & gold tones"*
* ✦ *"Explore paintings under PKR 200,000"*

### 4.4. Chat Timeline & Rich Artwork Cards
* **User Messages:** Right-aligned, understated taupe border with dark translucent fill.
* **Curator Responses:** Left-aligned, warm champagne typography with gold monogram avatar.
* **Embedded Painting Cards:** Interactive mini-card inside chat:
  * Artwork photo thumbnail
  * Title & Medium (*Oil on Belgian Linen*)
  * Physical dimensions (*120 × 90 cm*)
  * Price in PKR (*PKR 185,000*) & **live re-hydrated** status badge (*Available*)
  * Action buttons: **[View Painting]** and **[View on Wall]**

### 4.5. Typing State
* Replaces generic loading spinners with a luxury status line:
  > *“The Curator is reviewing the collection…”* with subtle breathing gold dots.

---

## 5. Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Browser (Client)                      │
│                                                             │
│   ┌──────────────────────┐      ┌─────────────────────────┐ │
│   │ CuratorTrigger.jsx   │      │ CuratorDrawer.jsx       │ │
│   │ (Gold floating seal) │ ───► │ (Slide-over UI)         │ │
│   └──────────────────────┘      └────────────┬────────────┘ │
└──────────────────────────────────────────────┼──────────────┘
                                               │
                                 POST /api/curator
                           (Message history + Compact Manifest)
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────┐
│            Vercel Edge Runtime (/api/curator.js)            │
│                                                             │
│   1. Edge execution (<50ms cold start, streaming enabled)   │
│   2. Validates origin & applies rate-limiting               │
│   3. Constructs token-efficient prompt with strict tokens   │
│   4. Streams Gemini 1.5 Flash tokens via ReadableStream     │
│   5. Emits [artwork:slug] for deterministic client cards    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
               ┌──────────────────────────────┐
               │    Google Gemini 1.5 Flash   │
               │  (Fast, low latency, secure) │
               └──────────────────────────────┘
```

---

## 6. Phased Implementation Roadmap

### Phase 1: UI Foundation & Component Architecture
* Build `src/components/curator/CuratorTrigger.jsx` and `src/components/curator/CuratorDrawer.jsx`.
* Create `src/styles/curator.css` using established Gallery Noir design tokens (`#151410`, `#D0A971`, `#EDE8DF`).
* Implement starter suggestion pills and message timeline scaffolding.

### Phase 2: Catalog Manifest & Deterministic Token Parser
* Create `src/utils/curatorCatalog.js` providing the compressed manifest.
* Implement `[artwork:slug]` parser and client `<CuratorPaintingCard />` with live stock re-hydration.

### Phase 3: Edge Streaming API Endpoint
* Create `/api/curator.js` using Vercel Edge Runtime and Gemini streaming.
* Implement network retry and graceful latency notices.

### Phase 4: Integration with Platform Features
* Link curator card buttons directly to the **View on Wall** room simulator (`WallSimulator.jsx`) and painting detail pages (`/painting/:slug`).
* Add keyboard accessibility (Escape to close, focus trap inside drawer).

### Phase 5: Verification, Testing & Polish
* Automated Playwright tests verifying drawer toggle, mobile responsiveness, streaming chunks, and invalid slug handling.
* Production build validation (`npm run build` and `npm run lint`).
