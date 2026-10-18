# Production Launch Checklist

This document details the final deployment steps for the studio owner to safely launch **The Atelier by SK**.

---

## 1. Environment Variables Configuration

Set the following environment variables in production (names only; never commit or expose values):

- `VITE_SUPABASE_URL` — Supabase project URL.
- `VITE_SUPABASE_ANON_KEY` — Public anon API key only (never use `service_role`).
- `VITE_WHATSAPP_NUMBER` — Studio WhatsApp business contact number for enquiries.

---

## 2. Admin User Provisioning

1. Navigate to **Supabase Dashboard → Authentication → Users**.
2. Click **Add User → Create User**:
   - Provide the owner/administrator email address and a strong password.
   - Ensure **Auto Confirm User** is checked.
3. Copy the newly generated **User UID** (`UUID`).

---

## 3. Authorize Admin in Database

In the **Supabase SQL Editor**, execute the following query to authorize the user in `public.admins`:

```sql
insert into public.admins (user_id)
values ('<PASTE_COPIED_USER_UID_HERE>');
```

---

## 4. Execute Core Database Schema

1. Open `supabase/schema.sql` in the repository.
2. Run the script in the **Supabase SQL Editor**.
3. This sets up:
   - `paintings`, `painting_images`, `orders`, `order_items`, and `admins` tables.
   - Strict row-level security (RLS) restricting order reads and catalog writes to authorized admins.
   - Security-definer RPCs `place_order`, `is_admin`, and `release_stale_reservations`.
   - Automated triggers linking order status changes to painting availability.
   - Public-read, admin-write Storage bucket `paintings`.

---

## 5. Client Catalog Confirmation & Launch Migration

Before migrating catalog artwork from placeholders to real client originals, obtain client (SK) sign-off on the **CONFIRM WITH CLIENT** list below:

### Items to Confirm with SK:
1. **Artwork 1 (`al-asr`)**:
   - Slug: `al-asr`
   - Title: `Al-Asr`
   - Price: `PKR 285,000`
   - Dimensions: `90 × 120 cm`
   - Medium: `Textured calligraphy on canvas`
2. **Artwork 2 (`mountain-ridge`)**:
   - Slug: `mountain-ridge`
   - Title: `Mountain Ridge`
   - Price: `PKR 195,000`
   - Dimensions: `80 × 120 cm`
   - Medium: `Mixed media on canvas`

Once confirmed:
- Open `supabase/launch-catalog.sql`.
- Run the script in the **Supabase SQL Editor**.
- It safely cleans up placeholder seeds that have no associated orders and inserts the authentic catalog artworks.

---

## 6. Run Security Verification Suite

Run the automated anon key security check from your terminal:

```bash
npm run check:supabase
```

Confirm all 10 checks pass:
- Catalog paintings are readable.
- `orders`, `order_items`, and `admins` return zero rows to public visitors.
- Direct inserts and updates on `paintings` are rejected or modify zero rows.
- Maintenance function `release_stale_reservations` is rejected for unauthenticated users.
- `place_order` correctly rejects invalid phone numbers (`ATL02`), empty item lists (`ATL01`), and invalid artwork UUIDs (`ATL03`).

---

## 7. End-to-End Test Order & Verification

1. On the live storefront, navigate to `/shop`.
2. Add an available piece to your acquisition cart and proceed to `/checkout`.
3. Submit a test order with a valid Pakistani mobile number (e.g., `0300 1234567`).
4. Verify navigation to `/order-confirmation` displaying the server-generated reference (`ATL-XXXXXX`).
5. Open `/admin` in your browser and sign in with the admin user credentials.
6. Check that the new order appears under **Orders** with status `pending`.
7. Confirm order details and consequence dialogs:
   - Test changing status to `confirmed` (verifying artwork status updates to `sold`).
   - Test changing status to `cancelled` (verifying artwork returns to `available`).
8. Toggle payment status to test payment tracking.

---

## 8. Known System Limitations

- **Currency**: Transactions and catalog pricing are denominated in PKR. International collectors are guided to WhatsApp enquiry via the prominent international order prompt.
- **Order Size**: `place_order` strictly allows between 1 and 5 paintings per order submission to safeguard studio inventory.
- **Ledger Immutability**: A painting referenced in existing orders cannot be deleted from the database in order to preserve financial and provenance records.
