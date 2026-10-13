-- =============================================================================
-- The Atelier by SK — Supabase schema, security and ordering logic (M2.1)
-- =============================================================================
-- Run this file in the Supabase SQL Editor (see supabase/README.md for order).
-- It is idempotent: safe to run again after edits.
--
-- Project settings this file assumes:
--   * "Automatically expose new tables" is OFF  -> every table needs explicit GRANTs.
--   * "Automatic RLS" is ON                     -> we still enable RLS explicitly.
--   * Public sign-ups are disabled; exactly one admin user exists (table `admins`).
--   * Money is whole PKR rupees stored as integers.
--
-- SECURITY MODEL IN ONE PARAGRAPH
--   Visitors (anon) may only READ paintings and painting images, and call
--   place_order(). They have no privileges at all on orders / order_items / admins.
--   The admin (authenticated + listed in `admins`) manages everything through RLS
--   policies gated by is_admin(). Prices and availability are NEVER trusted from
--   the client: place_order() reads them from the database under row locks.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. ENUMS (idempotent: CREATE TYPE has no IF NOT EXISTS)
-- -----------------------------------------------------------------------------
do $$ begin
  create type public.painting_status as enum ('available', 'reserved', 'sold');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_status as enum ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method as enum ('cod', 'bank_transfer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum ('unpaid', 'paid');
exception when duplicate_object then null; end $$;


-- -----------------------------------------------------------------------------
-- 2. TABLES
-- -----------------------------------------------------------------------------

-- 2.1 paintings — one row per one-of-one original.
create table if not exists public.paintings (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  title       text not null,
  description text,
  price_pkr   integer not null check (price_pkr >= 0),   -- whole rupees
  width_cm    numeric,
  height_cm   numeric,
  medium      text,
  year        integer,
  status      public.painting_status not null default 'available',
  featured    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint paintings_title_not_blank check (char_length(btrim(title)) > 0)
);

-- 2.2 painting_images — sort_order 0 is the main image.
create table if not exists public.painting_images (
  id           uuid primary key default gen_random_uuid(),
  painting_id  uuid not null references public.paintings (id) on delete cascade,
  url          text not null,
  storage_path text,                       -- null for site-relative/placeholder images
  sort_order   integer not null default 0,
  alt          text
);

-- 2.3 orders — written ONLY by place_order() (and updated by the admin).
create table if not exists public.orders (
  id             uuid primary key default gen_random_uuid(),
  reference      text not null unique,
  status         public.order_status not null default 'pending',
  payment_method public.payment_method not null,
  payment_status public.payment_status not null default 'unpaid',
  customer_name  text not null,
  customer_phone text not null,
  customer_email text,
  city           text not null,
  address        text not null,
  notes          text,
  total_pkr      integer not null check (total_pkr >= 0),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  -- ATL-XXXXXX, alphabet without 0, O, 1, I
  constraint orders_reference_format  check (reference ~ '^ATL-[A-HJ-NP-Z2-9]{6}$'),
  constraint orders_name_length       check (char_length(customer_name) between 2 and 100),
  constraint orders_phone_format      check (customer_phone ~ '^\+923[0-9]{9}$'),
  constraint orders_email_format      check (customer_email is null
                                             or (char_length(customer_email) <= 254
                                                 and customer_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  constraint orders_city_length       check (char_length(city) between 2 and 80),
  constraint orders_address_length    check (char_length(address) between 5 and 500),
  constraint orders_notes_length      check (notes is null or char_length(notes) <= 1000)
);

-- 2.4 order_items — snapshots keep history correct even if a painting is edited.
create table if not exists public.order_items (
  id                 uuid primary key default gen_random_uuid(),
  order_id           uuid not null references public.orders (id) on delete cascade,
  painting_id        uuid not null references public.paintings (id) on delete restrict,
  title_snapshot     text not null,
  price_snapshot_pkr integer not null check (price_snapshot_pkr >= 0),
  constraint order_items_unique_painting unique (order_id, painting_id)
);

-- 2.5 admins — exactly one row expected. The first row is inserted manually
--     (see supabase/README.md). There is deliberately NO insert policy.
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);


-- -----------------------------------------------------------------------------
-- 3. INDEXES
-- -----------------------------------------------------------------------------
create index if not exists paintings_status_idx          on public.paintings (status);
create index if not exists paintings_featured_idx        on public.paintings (featured);
create index if not exists painting_images_order_idx     on public.painting_images (painting_id, sort_order);
create index if not exists orders_created_at_idx         on public.orders (created_at desc);
create index if not exists orders_status_idx             on public.orders (status);
create index if not exists order_items_order_id_idx      on public.order_items (order_id);
-- Supports the per-phone rate limit lookup inside place_order().
create index if not exists orders_phone_created_idx      on public.orders (customer_phone, created_at desc);


-- -----------------------------------------------------------------------------
-- 4. FUNCTIONS
-- -----------------------------------------------------------------------------

-- 4.1 Generic updated_at trigger function.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- 4.2 is_admin(): true when the calling JWT user is listed in `admins`.
--     SECURITY DEFINER so it can read `admins` even though callers cannot.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins a where a.user_id = (select auth.uid())
  );
$$;

-- 4.3 Internal helper: random reference like ATL-K7Q2MX.
--     32-character alphabet (no 0, O, 1, I). 256 is divisible by 32, so using
--     the byte modulo 32 has no bias. Random bytes come from gen_random_uuid().
create or replace function public.generate_order_reference()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  c_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_bytes bytea := decode(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12), 'hex'); -- 6 bytes
  v_code  text := '';
  i       integer;
begin
  for i in 0..5 loop
    v_code := v_code || substr(c_alphabet, (get_byte(v_bytes, i) % 32) + 1, 1);
  end loop;
  return 'ATL-' || v_code;
end;
$$;

-- 4.4 place_order(): the ONLY way a public visitor creates an order.
--
-- Error contract (stable): RAISE EXCEPTION with message = code, custom SQLSTATE
--   ATL01  INVALID_ITEMS              (detail explains)
--   ATL02  INVALID_CUSTOMER / INVALID_PAYMENT_METHOD  (detail = field name)
--   ATL03  PAINTING_UNAVAILABLE       (detail = painting id; missing, reserved or sold)
--   ATL04  RATE_LIMITED               (3+ pending orders from this phone in 24h)
--   ATL05  REFERENCE_GENERATION_FAILED
-- Any error rolls the whole call back: nothing changes.
create or replace function public.place_order(
  p_items          uuid[],
  p_customer       jsonb,
  p_payment_method public.payment_method
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name        text;
  v_phone       text;
  v_email       text;
  v_city        text;
  v_address     text;
  v_notes       text;
  v_sorted      uuid[];
  v_missing     uuid;
  v_unavailable uuid;
  v_total       bigint;
  v_pending     integer;
  v_order_id    uuid;
  v_reference   text;
  v_attempt     integer := 0;
begin
  ---------------------------------------------------------------- items
  if p_items is null or cardinality(p_items) < 1 or cardinality(p_items) > 5 then
    raise exception 'INVALID_ITEMS' using errcode = 'ATL01',
      detail = 'An order must contain between 1 and 5 paintings.';
  end if;

  if exists (select 1 from unnest(p_items) as t(id) where t.id is null) then
    raise exception 'INVALID_ITEMS' using errcode = 'ATL01',
      detail = 'Painting ids must not be null.';
  end if;

  if (select count(distinct t.id) from unnest(p_items) as t(id)) <> cardinality(p_items) then
    raise exception 'INVALID_ITEMS' using errcode = 'ATL01',
      detail = 'Duplicate paintings are not allowed.';
  end if;

  ---------------------------------------------------------------- customer
  if p_customer is null or jsonb_typeof(p_customer) <> 'object' then
    raise exception 'INVALID_CUSTOMER' using errcode = 'ATL02', detail = 'customer';
  end if;

  v_name    := btrim(coalesce(p_customer ->> 'name', ''));
  v_phone   := btrim(coalesce(p_customer ->> 'phone', ''));
  v_email   := nullif(btrim(coalesce(p_customer ->> 'email', '')), '');
  v_city    := btrim(coalesce(p_customer ->> 'city', ''));
  v_address := btrim(coalesce(p_customer ->> 'address', ''));
  v_notes   := nullif(btrim(coalesce(p_customer ->> 'notes', '')), '');

  if char_length(v_name) not between 2 and 100 then
    raise exception 'INVALID_CUSTOMER' using errcode = 'ATL02', detail = 'name';
  end if;
  if v_phone !~ '^\+923[0-9]{9}$' then
    raise exception 'INVALID_CUSTOMER' using errcode = 'ATL02', detail = 'phone';
  end if;
  if char_length(v_city) not between 2 and 80 then
    raise exception 'INVALID_CUSTOMER' using errcode = 'ATL02', detail = 'city';
  end if;
  if char_length(v_address) not between 5 and 500 then
    raise exception 'INVALID_CUSTOMER' using errcode = 'ATL02', detail = 'address';
  end if;
  if v_notes is not null and char_length(v_notes) > 1000 then
    raise exception 'INVALID_CUSTOMER' using errcode = 'ATL02', detail = 'notes';
  end if;
  if v_email is not null
     and (char_length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') then
    raise exception 'INVALID_CUSTOMER' using errcode = 'ATL02', detail = 'email';
  end if;

  if p_payment_method is null then
    raise exception 'INVALID_PAYMENT_METHOD' using errcode = 'ATL02', detail = 'payment_method';
  end if;

  ---------------------------------------------------------------- anti-abuse
  -- Serialise concurrent calls for the same phone so the count below is reliable.
  perform pg_advisory_xact_lock(hashtextextended('place_order:' || v_phone, 0));

  select count(*) into v_pending
  from public.orders o
  where o.customer_phone = v_phone
    and o.status = 'pending'
    and o.created_at > now() - interval '24 hours';

  if v_pending >= 3 then
    raise exception 'RATE_LIMITED' using errcode = 'ATL04',
      detail = 'Too many pending orders for this phone number.';
  end if;

  ---------------------------------------------------------------- lock paintings
  -- Lock in sorted id order so two overlapping orders can never deadlock.
  select array_agg(t.id order by t.id) into v_sorted from unnest(p_items) as t(id);

  perform 1
  from public.paintings p
  where p.id = any (v_sorted)
  order by p.id
  for update;

  -- Missing painting?
  select t.id into v_missing
  from unnest(v_sorted) as t(id)
  where not exists (select 1 from public.paintings p where p.id = t.id)
  order by t.id
  limit 1;

  if v_missing is not null then
    raise exception 'PAINTING_UNAVAILABLE' using errcode = 'ATL03', detail = v_missing::text;
  end if;

  -- Not available (reserved or sold)?
  select p.id into v_unavailable
  from public.paintings p
  where p.id = any (v_sorted) and p.status <> 'available'
  order by p.id
  limit 1;

  if v_unavailable is not null then
    raise exception 'PAINTING_UNAVAILABLE' using errcode = 'ATL03', detail = v_unavailable::text;
  end if;

  ---------------------------------------------------------------- total (server-side only)
  select sum(p.price_pkr) into v_total
  from public.paintings p
  where p.id = any (v_sorted);

  if v_total > 2147483647 then
    raise exception 'INVALID_ITEMS' using errcode = 'ATL01', detail = 'Order total is too large.';
  end if;

  ---------------------------------------------------------------- create the order
  loop
    v_attempt := v_attempt + 1;
    if v_attempt > 10 then
      raise exception 'REFERENCE_GENERATION_FAILED' using errcode = 'ATL05';
    end if;

    v_reference := public.generate_order_reference();

    insert into public.orders (
      reference, payment_method, customer_name, customer_phone, customer_email,
      city, address, notes, total_pkr
    )
    values (
      v_reference, p_payment_method, v_name, v_phone, v_email,
      v_city, v_address, v_notes, v_total::integer
    )
    on conflict (reference) do nothing
    returning id into v_order_id;

    exit when v_order_id is not null;   -- null means a reference collision: retry
  end loop;

  insert into public.order_items (order_id, painting_id, title_snapshot, price_snapshot_pkr)
  select v_order_id, p.id, p.title, p.price_pkr
  from public.paintings p
  where p.id = any (v_sorted);

  update public.paintings
     set status = 'reserved'
   where id = any (v_sorted);

  return jsonb_build_object(
    'order_id',  v_order_id,
    'reference', v_reference,
    'total_pkr', v_total::integer,
    'items', (
      select jsonb_agg(
               jsonb_build_object(
                 'painting_id', oi.painting_id,
                 'title',       oi.title_snapshot,
                 'price_pkr',   oi.price_snapshot_pkr
               )
               order by oi.title_snapshot
             )
      from public.order_items oi
      where oi.order_id = v_order_id
    )
  );
end;
$$;

-- 4.5 Keep painting status in step with order status (no manual painting edits).
--     confirmed -> paintings become 'sold'
--     cancelled -> paintings return to 'available' ONLY if currently 'reserved'
create or replace function public.sync_painting_status_from_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'confirmed' then
    update public.paintings p
       set status = 'sold'
     where p.id in (select oi.painting_id from public.order_items oi where oi.order_id = new.id)
       and p.status <> 'sold';
  elsif new.status = 'cancelled' then
    update public.paintings p
       set status = 'available'
     where p.id in (select oi.painting_id from public.order_items oi where oi.order_id = new.id)
       and p.status = 'reserved';
  end if;
  return new;
end;
$$;


-- -----------------------------------------------------------------------------
-- 5. TRIGGERS
-- -----------------------------------------------------------------------------
drop trigger if exists paintings_set_updated_at on public.paintings;
create trigger paintings_set_updated_at
  before update on public.paintings
  for each row execute function public.set_updated_at();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

drop trigger if exists orders_sync_painting_status on public.orders;
create trigger orders_sync_painting_status
  after update of status on public.orders
  for each row
  when (old.status is distinct from new.status)
  execute function public.sync_painting_status_from_order();


-- -----------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY
-- (No FORCE: the table owner / SECURITY DEFINER functions must bypass RLS.)
-- -----------------------------------------------------------------------------
alter table public.paintings       enable row level security;
alter table public.painting_images enable row level security;
alter table public.orders          enable row level security;
alter table public.order_items     enable row level security;
alter table public.admins          enable row level security;


-- -----------------------------------------------------------------------------
-- 7. GRANTS — start from zero, then grant only what each role needs.
-- -----------------------------------------------------------------------------
revoke all on table public.paintings       from public, anon, authenticated;
revoke all on table public.painting_images from public, anon, authenticated;
revoke all on table public.orders          from public, anon, authenticated;
revoke all on table public.order_items     from public, anon, authenticated;
revoke all on table public.admins          from public, anon, authenticated;

-- Catalogue: everyone reads; writes are limited by policy to the admin.
grant select                         on public.paintings       to anon, authenticated;
grant select                         on public.painting_images to anon, authenticated;
grant insert, update, delete         on public.paintings       to authenticated;
grant insert, update, delete         on public.painting_images to authenticated;

-- Orders: anon has NOTHING. authenticated may SELECT/UPDATE, but policies
-- below restrict both to the admin. No insert/delete privilege exists at all.
grant select, update on public.orders      to authenticated;
grant select, update on public.order_items to authenticated;

-- Admins: an authenticated user may read only their own row (policy below).
grant select on public.admins to authenticated;

-- Functions: nothing is executable by default.
revoke all on function public.is_admin()                  from public;
revoke all on function public.generate_order_reference()  from public, anon, authenticated;
revoke all on function public.sync_painting_status_from_order() from public, anon, authenticated;
revoke all on function public.place_order(uuid[], jsonb, public.payment_method) from public;

-- is_admin() is evaluated inside policies as the calling role, so both need it.
grant execute on function public.is_admin() to anon, authenticated;
-- The only public entry point for creating orders.
grant execute on function public.place_order(uuid[], jsonb, public.payment_method) to anon, authenticated;


-- -----------------------------------------------------------------------------
-- 8. POLICIES (drop + create keeps this file re-runnable)
-- -----------------------------------------------------------------------------

-- 8.1 paintings
drop policy if exists paintings_select_all   on public.paintings;
drop policy if exists paintings_admin_insert on public.paintings;
drop policy if exists paintings_admin_update on public.paintings;
drop policy if exists paintings_admin_delete on public.paintings;

create policy paintings_select_all on public.paintings
  for select to anon, authenticated using (true);
create policy paintings_admin_insert on public.paintings
  for insert to authenticated with check (public.is_admin());
create policy paintings_admin_update on public.paintings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy paintings_admin_delete on public.paintings
  for delete to authenticated using (public.is_admin());

-- 8.2 painting_images
drop policy if exists painting_images_select_all   on public.painting_images;
drop policy if exists painting_images_admin_insert on public.painting_images;
drop policy if exists painting_images_admin_update on public.painting_images;
drop policy if exists painting_images_admin_delete on public.painting_images;

create policy painting_images_select_all on public.painting_images
  for select to anon, authenticated using (true);
create policy painting_images_admin_insert on public.painting_images
  for insert to authenticated with check (public.is_admin());
create policy painting_images_admin_update on public.painting_images
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy painting_images_admin_delete on public.painting_images
  for delete to authenticated using (public.is_admin());

-- 8.3 orders (admin only; public orders go through place_order())
drop policy if exists orders_admin_select on public.orders;
drop policy if exists orders_admin_update on public.orders;

create policy orders_admin_select on public.orders
  for select to authenticated using (public.is_admin());
create policy orders_admin_update on public.orders
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- 8.4 order_items (admin only)
drop policy if exists order_items_admin_select on public.order_items;
drop policy if exists order_items_admin_update on public.order_items;

create policy order_items_admin_select on public.order_items
  for select to authenticated using (public.is_admin());
create policy order_items_admin_update on public.order_items
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- 8.5 admins: a user may see only their own row. No insert/update/delete policy.
drop policy if exists admins_select_own on public.admins;

create policy admins_select_own on public.admins
  for select to authenticated using (user_id = (select auth.uid()));


-- -----------------------------------------------------------------------------
-- 9. STORAGE — public-read bucket 'paintings', admin-only writes
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'paintings', 'paintings', true,
  5 * 1024 * 1024,                                   -- 5 MB
  array['image/jpeg', 'image/webp', 'image/png']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists paintings_bucket_public_read  on storage.objects;
drop policy if exists paintings_bucket_admin_insert on storage.objects;
drop policy if exists paintings_bucket_admin_update on storage.objects;
drop policy if exists paintings_bucket_admin_delete on storage.objects;

create policy paintings_bucket_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'paintings');

create policy paintings_bucket_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'paintings' and public.is_admin());

create policy paintings_bucket_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'paintings' and public.is_admin())
  with check (bucket_id = 'paintings' and public.is_admin());

create policy paintings_bucket_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'paintings' and public.is_admin());
