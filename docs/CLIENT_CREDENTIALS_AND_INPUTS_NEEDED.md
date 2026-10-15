# The Atelier by SK — Client Credentials & Inputs Checklist

This checklist contains the external credentials, assets, and details required to transition the storefront from local development/mock mode to live production.

---

## 1. Supabase Credentials (For Live Catalog & Database)
To connect the live catalog to Supabase (so that artwork status, pricing, and orders synchronize directly with your database):
- [ ] **`VITE_SUPABASE_URL`**: Your Supabase project URL (e.g. `https://your-project-id.supabase.co`)
- [ ] **`VITE_SUPABASE_ANON_KEY`**: Your Supabase public `anon` key (safe for browser storefront usage)

> **Where to add them:** Place these inside `.env.local` (which is git-ignored and stays secure on your computer):
> ```env
> VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
> VITE_SUPABASE_ANON_KEY=eyJh......
> VITE_USE_MOCK_DATA=false
> ```

---

## 2. Google Gemini API Key (For The Atelier Curator AI Concierge)
The Curator AI Concierge streaming endpoint uses Gemini 1.5 Flash to converse with collectors and recommend original paintings.
- [ ] **`GEMINI_API_KEY`**: Obtain from [Google AI Studio](https://aistudio.google.com/app/apikey).

> **Where to add it:** Add to `.env.local` for local development and to your Vercel Project Environment Variables for production deployment:
> ```env
> GEMINI_API_KEY=AIzaSy......
> ```
*(Note: A luxury curated fallback is already built-in, so the chatbot works seamlessly in development even before you paste the key!)*

---

## 3. Contact & Concierge Details
To replace placeholders currently set to `TODO_CLIENT_NUMBER`:
- [ ] **Official WhatsApp Business Number**: International format with country code (e.g., `+92 300 1234567`).
- [ ] **Official Studio Email**: For commission inquiries and collector correspondence (e.g., `concierge@theatelierbysk.com`).
- [ ] **Physical Studio / Salon Location**: City / Address in Lahore/Karachi if private salon viewings are open to collectors by appointment.

---

## 4. Media & Assets for About Page
- [ ] **Artist Studio Portrait / Photographs**: 1–3 high-resolution photographs of SK in the studio working with the palette knife or in front of the impasto canvases.
- [ ] **Signature Image (Optional)**: High-resolution PNG or SVG scan of SK’s signature/monogram seal to feature on certificates and the About page.
- [ ] **Artist Biography Q&A**: Specific details or quotes from SK regarding the studio’s founding story, impasto philosophy, and artistic vision.
