# The Atelier by SK — Supabase Database & Security Guide (M2.1)

This directory contains the production-grade PostgreSQL / Supabase schema, Row-Level Security (RLS) policies, ordering transaction engine, and test suite for **The Atelier by SK**.

---

## 1. Execution Order in Supabase SQL Editor

Run the SQL files in this exact order in the **Supabase Dashboard → SQL Editor**:

1. **`supabase/schema.sql`**
   - Creates enums (`painting_status`, `order_status`, `payment_method`, `payment_status`).
   - Creates tables (`paintings`, `painting_images`, `orders`, `order_items`, `admins`).
   - Sets up indexes, `set_updated_at` triggers, and the automatic `sync_painting_status_from_order` status trigger.
   - Declares the atomic, security definer `place_order()` transaction engine.
   - Enforces strict Row Level Security (RLS) and explicit minimal role `GRANT` statements.
   - Creates and configures the public `paintings` storage bucket.
   - *Safe to run repeatedly (fully idempotent).*

2. **`supabase/seed.sql`**
   - Seeds the 12 curated placeholder paintings (9 available, 3 sold, 4 featured) and their corresponding primary/detail image records.
   - *Safe to run repeatedly (uses `on conflict do nothing`).*

3. **`supabase/tests/security.sql`**
   - Automated 11-part security verification suite.
   - Simulates `anon` and non-admin `authenticated` roles with JWT claims.
   - Verifies read/write restrictions, RLS policies, validation checks, concurrency locks, rate limits, and order lifecycle triggers.
   - *Runs inside a `begin; ... rollback;` transaction, leaving zero test artifacts behind.*

---

## 2. Adding the First Administrator

Public sign-ups are disabled, and there is deliberately **no public insert policy** on the `admins` table.

To grant administrative privileges:
1. In the Supabase Dashboard, go to **Authentication → Users** and create or find the admin user.
2. Copy the user's `id` (UUID).
3. In the **SQL Editor**, run the following statement locally (substituting the owner UUID):

```sql
-- Replace the placeholder UUID with the actual auth.users id from Supabase Auth:
-- INSERT INTO public.admins (user_id)
-- VALUES ('00000000-0000-0000-0000-000000000000'::uuid)
-- ON CONFLICT (user_id) DO NOTHING;
```

> **Security Note:** Never commit actual admin emails or user UUIDs into version control.

---

## 3. Policy Protection Overview

Every table starts with `REVOKE ALL ... FROM public, anon, authenticated;` so that access is granted strictly through explicit capabilities:

| Resource | Target Role | Permitted Actions | Policy Protection & Logic |
| :--- | :--- | :--- | :--- |
| **`paintings`** | `anon`, `authenticated` | `SELECT` | Public storefront catalog browsing. |
| **`paintings`** | `authenticated` | `INSERT`, `UPDATE`, `DELETE` | Gated by `is_admin()`. Non-admins and visitors cannot alter titles, prices, or statuses directly. |
| **`painting_images`** | `anon`, `authenticated` | `SELECT` | Public storefront artwork imagery. |
| **`painting_images`** | `authenticated` | `INSERT`, `UPDATE`, `DELETE` | Gated by `is_admin()`. |
| **`orders`** | `anon` | *None* | Zero direct access. Public orders must go through the atomic `place_order()` function. |
| **`orders`** | `authenticated` | `SELECT`, `UPDATE` | Gated by `is_admin()`. The gallery owner can review orders and update fulfillment status. Direct `INSERT` / `DELETE` are revoked for all client roles. |
| **`order_items`** | `anon` | *None* | Zero direct access. Populated only via `place_order()`. |
| **`order_items`** | `authenticated` | `SELECT`, `UPDATE` | Gated by `is_admin()`. |
| **`admins`** | `anon` | *None* | Zero access. Admin identity and presence are shielded. |
| **`admins`** | `authenticated` | `SELECT` | Gated by `user_id = auth.uid()`. An admin can verify their own status, but cannot inspect other rows. |
| **`place_order()`** | `anon`, `authenticated` | `EXECUTE` | Atomic checkout RPC (`SECURITY DEFINER`). Validates item count (1–5), customer info, Pakistani phone format, locks artwork rows with `FOR UPDATE`, enforces rate limits (max 3 pending orders per phone in 24h), computes total strictly from DB records, generates unique `ATL-XXXXXX` references, and reserves artwork. |
| **Storage (`paintings`)** | `anon`, `authenticated` | `SELECT` | Public CDN image delivery. |
| **Storage (`paintings`)** | `authenticated` | `INSERT`, `UPDATE`, `DELETE` | Gated by `public.is_admin()`. |
