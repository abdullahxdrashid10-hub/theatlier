-- =============================================================================
-- The Atelier by SK — Security and RLS Test Suite (M2.1)
-- =============================================================================
-- Runs inside a single transaction and ends with ROLLBACK so no test artifacts
-- remain in the database.
-- Run in the Supabase SQL Editor AFTER schema.sql and seed.sql.
-- If any test fails, an EXCEPTION is raised and execution halts immediately.
-- On complete success, NOTICE messages are logged for each assertion.
-- Concurrency safety (FOR UPDATE in sorted order) is tested separately via
-- parallel clients; this suite runs sequentially in a single transaction.
-- =============================================================================

begin;

do $$
declare
  v_test_p1       uuid;
  v_test_p2       uuid;
  v_test_p3       uuid;
  v_test_p4       uuid;
  v_test_p5       uuid;
  v_test_p6       uuid;
  v_price1        integer;
  v_price2        integer;
  v_order_res     jsonb;
  v_order1_id     uuid;
  v_order2_res    jsonb;
  v_order2_id     uuid;
  v_order3_res    jsonb;
  v_order3_id     uuid;
  v_order4_res    jsonb;
  v_order4_id     uuid;
  v_order_ref     text;
  v_order_total   integer;
  v_status        public.painting_status;
  v_passed        boolean;
  v_customer      jsonb;
  v_customer2     jsonb;
  v_anon_count    integer;
  v_err_detail    text;
  v_admin_uuid    uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  v_stale_count   integer;
  v_admin_oi_count integer;
begin
  raise notice '=======================================================';
  raise notice 'STARTING M2.1 SECURITY & RLS TEST SUITE';
  raise notice '=======================================================';

  -- Fetch available paintings from seed for testing
  select id, price_pkr into v_test_p1, v_price1 from public.paintings where status = 'available' order by id limit 1 offset 0;
  select id, price_pkr into v_test_p2, v_price2 from public.paintings where status = 'available' order by id limit 1 offset 1;
  select id into v_test_p3 from public.paintings where status = 'available' order by id limit 1 offset 2;
  select id into v_test_p4 from public.paintings where status = 'available' order by id limit 1 offset 3;
  select id into v_test_p5 from public.paintings where status = 'available' order by id limit 1 offset 4;
  select id into v_test_p6 from public.paintings where status = 'available' order by id limit 1 offset 5;

  if v_test_p1 is null or v_test_p2 is null or v_test_p3 is null or v_test_p4 is null or v_test_p5 is null or v_test_p6 is null then
    raise exception 'TEST PREREQUISITE FAILED: At least 6 available paintings required from seed.sql';
  end if;

  v_customer := jsonb_build_object(
    'name',    'Fatima Al-Rashid',
    'phone',   '+923001234567',
    'email',   'collector@example.com',
    'city',    'Lahore',
    'address', '14-B Gulberg III',
    'notes',   'Please coordinate fine art crating delivery'
  );

  ---------------------------------------------------------------------------
  -- 1. anon CAN read paintings
  ---------------------------------------------------------------------------
  set local role anon;
  set local "request.jwt.claims" = '{"role": "anon"}';

  select count(*) into v_anon_count from public.paintings;
  if v_anon_count < 1 then
    raise exception 'TEST 1 FAILED: anon could not read paintings table';
  end if;
  raise notice 'PASS 1: anon CAN read paintings (% rows seen)', v_anon_count;

  ---------------------------------------------------------------------------
  -- 2. anon CANNOT select, insert, update or delete orders or order_items
  ---------------------------------------------------------------------------
  -- 2a. SELECT orders
  v_passed := false;
  begin
    perform * from public.orders limit 1;
  exception when insufficient_privilege then
    v_passed := true;
  end;
  if not v_passed then
    raise exception 'TEST 2a FAILED: anon was able to select from orders';
  end if;

  -- 2b. INSERT orders
  v_passed := false;
  begin
    insert into public.orders (reference, payment_method, customer_name, customer_phone, city, address, total_pkr)
    values ('ATL-AAAAAA', 'cod', 'Anon Hacker', '+923000000000', 'Karachi', 'Street 1', 1000);
  exception when insufficient_privilege then
    v_passed := true;
  end;
  if not v_passed then
    raise exception 'TEST 2b FAILED: anon was able to insert into orders';
  end if;

  -- 2c. UPDATE orders
  v_passed := false;
  begin
    update public.orders set status = 'confirmed' where true;
  exception when insufficient_privilege then
    v_passed := true;
  end;
  if not v_passed then
    raise exception 'TEST 2c FAILED: anon was able to update orders';
  end if;

  -- 2d. DELETE orders
  v_passed := false;
  begin
    delete from public.orders where true;
  exception when insufficient_privilege then
    v_passed := true;
  end;
  if not v_passed then
    raise exception 'TEST 2d FAILED: anon was able to delete from orders';
  end if;

  -- 2e. SELECT order_items
  v_passed := false;
  begin
    perform * from public.order_items limit 1;
  exception when insufficient_privilege then
    v_passed := true;
  end;
  if not v_passed then
    raise exception 'TEST 2e FAILED: anon was able to select from order_items';
  end if;

  -- 2f. INSERT order_items
  v_passed := false;
  begin
    insert into public.order_items (order_id, painting_id, title_snapshot, price_snapshot_pkr)
    values (gen_random_uuid(), v_test_p1, 'Hack', 0);
  exception when insufficient_privilege then
    v_passed := true;
  end;
  if not v_passed then
    raise exception 'TEST 2f FAILED: anon was able to insert into order_items';
  end if;

  -- 2g. UPDATE order_items
  v_passed := false;
  begin
    update public.order_items set price_snapshot_pkr = 0 where true;
  exception when insufficient_privilege then
    v_passed := true;
  end;
  if not v_passed then
    raise exception 'TEST 2g FAILED: anon was able to update order_items';
  end if;

  -- 2h. DELETE order_items
  v_passed := false;
  begin
    delete from public.order_items where true;
  exception when insufficient_privilege then
    v_passed := true;
  end;
  if not v_passed then
    raise exception 'TEST 2h FAILED: anon was able to delete from order_items';
  end if;

  raise notice 'PASS 2: anon CANNOT select, insert, update or delete orders or order_items';

  ---------------------------------------------------------------------------
  -- 3. anon CANNOT insert, update or delete paintings or painting_images
  ---------------------------------------------------------------------------
  -- 3a. INSERT paintings
  v_passed := false;
  begin
    insert into public.paintings (slug, title, price_pkr) values ('anon-hack', 'Hack', 100);
  exception when insufficient_privilege then
    v_passed := true;
  end;
  if not v_passed then
    raise exception 'TEST 3a FAILED: anon was able to insert into paintings';
  end if;

  -- 3b. UPDATE paintings
  v_passed := false;
  begin
    update public.paintings set price_pkr = 1 where id = v_test_p1;
  exception when insufficient_privilege then
    v_passed := true;
  end;
  if not v_passed then
    raise exception 'TEST 3b FAILED: anon was able to update paintings';
  end if;

  -- 3c. DELETE paintings
  v_passed := false;
  begin
    delete from public.paintings where id = v_test_p1;
  exception when insufficient_privilege then
    v_passed := true;
  end;
  if not v_passed then
    raise exception 'TEST 3c FAILED: anon was able to delete from paintings';
  end if;

  -- 3d. INSERT painting_images
  v_passed := false;
  begin
    insert into public.painting_images (painting_id, url) values (v_test_p1, '/hack.svg');
  exception when insufficient_privilege then
    v_passed := true;
  end;
  if not v_passed then
    raise exception 'TEST 3d FAILED: anon was able to insert into painting_images';
  end if;

  -- 3e. UPDATE painting_images
  v_passed := false;
  begin
    update public.painting_images set url = '/hack.svg' where painting_id = v_test_p1;
  exception when insufficient_privilege then
    v_passed := true;
  end;
  if not v_passed then
    raise exception 'TEST 3e FAILED: anon was able to update painting_images';
  end if;

  -- 3f. DELETE painting_images
  v_passed := false;
  begin
    delete from public.painting_images where painting_id = v_test_p1;
  exception when insufficient_privilege then
    v_passed := true;
  end;
  if not v_passed then
    raise exception 'TEST 3f FAILED: anon was able to delete from painting_images';
  end if;

  raise notice 'PASS 3: anon CANNOT insert, update or delete paintings or painting_images';

  ---------------------------------------------------------------------------
  -- 4. anon CANNOT read admins
  ---------------------------------------------------------------------------
  v_passed := false;
  begin
    perform * from public.admins limit 1;
  exception when insufficient_privilege then
    v_passed := true;
  end;
  if not v_passed then
    raise exception 'TEST 4 FAILED: anon was able to select from admins';
  end if;
  raise notice 'PASS 4: anon CANNOT read admins';

  ---------------------------------------------------------------------------
  -- 5. a non-admin authenticated user cannot modify paintings
  ---------------------------------------------------------------------------
  set local role authenticated;
  set local "request.jwt.claims" = '{"sub": "00000000-0000-0000-0000-000000000099", "role": "authenticated"}';

  -- 5a. INSERT rejected by policy
  v_passed := false;
  begin
    insert into public.paintings (slug, title, price_pkr) values ('user-hack', 'User Hack', 100);
  exception when check_violation or insufficient_privilege then
    v_passed := true;
  end;
  if not v_passed then
    raise exception 'TEST 5a FAILED: non-admin authenticated user inserted into paintings';
  end if;

  -- 5b. UPDATE rejected by policy (using (is_admin()) matches 0 rows)
  update public.paintings set price_pkr = 999 where id = v_test_p1;
  if found then
    raise exception 'TEST 5b FAILED: non-admin authenticated user updated paintings';
  end if;

  -- 5c. DELETE rejected by policy (using (is_admin()) matches 0 rows)
  delete from public.paintings where id = v_test_p1;
  if found then
    raise exception 'TEST 5c FAILED: non-admin authenticated user deleted paintings';
  end if;

  raise notice 'PASS 5: non-admin authenticated user cannot modify paintings';

  ---------------------------------------------------------------------------
  -- 6. place_order rejects bad phone, empty cart, and duplicate painting
  ---------------------------------------------------------------------------
  set local role anon;
  set local "request.jwt.claims" = '{"role": "anon"}';

  -- 6a. Bad phone format (e.g. 03001234567 without +92)
  v_passed := false;
  begin
    perform public.place_order(
      array[v_test_p1],
      jsonb_build_object('name', 'Ali Khan', 'phone', '03001234567', 'city', 'Lahore', 'address', 'Address valid'),
      'cod'
    );
  exception when others then
    if SQLSTATE = 'ATL02' then
      v_passed := true;
    end if;
  end;
  if not v_passed then
    raise exception 'TEST 6a FAILED: place_order accepted invalid phone format';
  end if;

  -- 6b. Empty cart
  v_passed := false;
  begin
    perform public.place_order(
      '{}'::uuid[],
      v_customer,
      'cod'
    );
  exception when others then
    if SQLSTATE = 'ATL01' then
      v_passed := true;
    end if;
  end;
  if not v_passed then
    raise exception 'TEST 6b FAILED: place_order accepted empty cart';
  end if;

  -- 6c. Duplicate painting in order
  v_passed := false;
  begin
    perform public.place_order(
      array[v_test_p1, v_test_p1],
      v_customer,
      'cod'
    );
  exception when others then
    if SQLSTATE = 'ATL01' then
      v_passed := true;
    end if;
  end;
  if not v_passed then
    raise exception 'TEST 6c FAILED: place_order accepted duplicate painting in item array';
  end if;

  raise notice 'PASS 6: place_order rejects bad phone, empty cart, and duplicate painting';

  ---------------------------------------------------------------------------
  -- 7. A valid place_order reserves the painting and returns server total
  ---------------------------------------------------------------------------
  v_order_res := public.place_order(
    array[v_test_p1, v_test_p2],
    v_customer,
    'cod'
  );

  v_order1_id   := (v_order_res ->> 'order_id')::uuid;
  v_order_ref   := v_order_res ->> 'reference';
  v_order_total := (v_order_res ->> 'total_pkr')::integer;

  if v_order1_id is null or v_order_ref is null then
    raise exception 'TEST 7a FAILED: place_order did not return order_id or reference';
  end if;

  if v_order_ref !~ '^ATL-[A-HJ-NP-Z2-9]{6}$' then
    raise exception 'TEST 7b FAILED: place_order reference % did not match pattern', v_order_ref;
  end if;

  if v_order_total <> (v_price1 + v_price2) then
    raise exception 'TEST 7c FAILED: computed total % does not match expected %', v_order_total, (v_price1 + v_price2);
  end if;

  -- Verify painting status is now 'reserved'
  reset role;
  select status into v_status from public.paintings where id = v_test_p1;
  if v_status <> 'reserved' then
    raise exception 'TEST 7d FAILED: painting status is %, expected reserved', v_status;
  end if;
  select status into v_status from public.paintings where id = v_test_p2;
  if v_status <> 'reserved' then
    raise exception 'TEST 7e FAILED: painting status is %, expected reserved', v_status;
  end if;

  raise notice 'PASS 7: valid place_order reserves paintings and computes correct total (Ref: %, Total: PKR %)', v_order_ref, v_order_total;

  ---------------------------------------------------------------------------
  -- 8. A second place_order for the same painting fails
  ---------------------------------------------------------------------------
  set local role anon;
  set local "request.jwt.claims" = '{"role": "anon"}';

  v_passed := false;
  begin
    perform public.place_order(
      array[v_test_p1],
      v_customer,
      'cod'
    );
  exception when others then
    if SQLSTATE = 'ATL03' then
      v_passed := true;
    end if;
  end;
  if not v_passed then
    raise exception 'TEST 8 FAILED: second place_order for reserved painting succeeded instead of throwing ATL03';
  end if;
  raise notice 'PASS 8: second place_order for same painting fails (caught ATL03)';

  ---------------------------------------------------------------------------
  -- 9. The 4th pending order from one phone is rejected (rate limit)
  ---------------------------------------------------------------------------
  -- Already placed 1 pending order for this phone (v_order1_id). Now place 2nd and 3rd.
  v_order2_res := public.place_order(
    array[v_test_p3],
    v_customer,
    'cod'
  );
  v_order2_id := (v_order2_res ->> 'order_id')::uuid;

  v_order3_res := public.place_order(
    array[v_test_p4],
    v_customer,
    'cod'
  );
  v_order3_id := (v_order3_res ->> 'order_id')::uuid;

  -- 4th order with same phone must be rejected with ATL04
  v_passed := false;
  begin
    perform public.place_order(
      array[v_test_p5],
      v_customer,
      'cod'
    );
  exception when others then
    if SQLSTATE = 'ATL04' then
      v_passed := true;
    end if;
  end;
  if not v_passed then
    raise exception 'TEST 9 FAILED: 4th pending order from same phone was not rejected with ATL04';
  end if;
  raise notice 'PASS 9: 4th pending order from same phone within 24h is rejected (caught ATL04)';

  ---------------------------------------------------------------------------
  -- 10. Confirming an order marks its paintings sold
  ---------------------------------------------------------------------------
  reset role;
  update public.orders set status = 'confirmed' where id = v_order1_id;

  select status into v_status from public.paintings where id = v_test_p1;
  if v_status <> 'sold' then
    raise exception 'TEST 10a FAILED: confirmed order did not mark painting 1 sold (status is %)', v_status;
  end if;
  select status into v_status from public.paintings where id = v_test_p2;
  if v_status <> 'sold' then
    raise exception 'TEST 10b FAILED: confirmed order did not mark painting 2 sold (status is %)', v_status;
  end if;
  raise notice 'PASS 10: confirming order triggers status = sold for paintings';

  ---------------------------------------------------------------------------
  -- 11. Cancelling a pending order restores painting to 'available'
  --     Capture each order id explicitly; never select by created_at.
  ---------------------------------------------------------------------------
  -- v_order2_id holds v_test_p3 (status: reserved).
  -- v_order3_id holds v_test_p4 (status: reserved).
  -- Cancel v_order2_id explicitly; v_test_p3 must become 'available',
  -- while v_test_p4 in v_order3_id MUST remain 'reserved'.
  reset role;
  update public.orders set status = 'cancelled' where id = v_order2_id;

  select status into v_status from public.paintings where id = v_test_p3;
  if v_status <> 'available' then
    raise exception 'TEST 11a FAILED: cancelling pending order did not restore reserved painting to available (status is %)', v_status;
  end if;

  select status into v_status from public.paintings where id = v_test_p4;
  if v_status <> 'reserved' then
    raise exception 'TEST 11b FAILED: cancelling order 2 unexpectedly affected painting in order 3 (status is %)', v_status;
  end if;

  raise notice 'PASS 11: cancelling pending order restores reserved painting to available without selecting by created_at';

  ---------------------------------------------------------------------------
  -- 12. Cancelling a confirmed order (status 'sold', old status <> 'delivered')
  --     restores paintings back to 'available'
  ---------------------------------------------------------------------------
  -- v_order1_id was confirmed in Test 10; v_test_p1 and v_test_p2 are currently 'sold'.
  update public.orders set status = 'cancelled' where id = v_order1_id;

  select status into v_status from public.paintings where id = v_test_p1;
  if v_status <> 'available' then
    raise exception 'TEST 12a FAILED: cancelling confirmed order did not restore painting 1 to available (status is %)', v_status;
  end if;

  select status into v_status from public.paintings where id = v_test_p2;
  if v_status <> 'available' then
    raise exception 'TEST 12b FAILED: cancelling confirmed order did not restore painting 2 to available (status is %)', v_status;
  end if;

  raise notice 'PASS 12: cancelling confirmed order (sold) restores paintings back to available';

  ---------------------------------------------------------------------------
  -- 13. Cancelling an order whose OLD status was 'delivered' keeps paintings 'sold'
  ---------------------------------------------------------------------------
  -- Place an order for v_test_p5 with a different phone number
  v_customer2 := jsonb_build_object(
    'name',    'Tariq Mahmood',
    'phone',   '+923331112233',
    'email',   'tariq@example.com',
    'city',    'Islamabad',
    'address', 'Sector F-7/2',
    'notes',   'Special delivery'
  );

  v_order4_res := public.place_order(
    array[v_test_p5],
    v_customer2,
    'card'
  );
  v_order4_id := (v_order4_res ->> 'order_id')::uuid;

  -- Progress order to confirmed then delivered
  update public.orders set status = 'confirmed' where id = v_order4_id;
  update public.orders set status = 'delivered' where id = v_order4_id;

  select status into v_status from public.paintings where id = v_test_p5;
  if v_status <> 'sold' then
    raise exception 'TEST 13a FAILED: painting status should be sold for delivered order, got %', v_status;
  end if;

  -- Now cancel the delivered order: painting must remain 'sold'
  update public.orders set status = 'cancelled' where id = v_order4_id;

  select status into v_status from public.paintings where id = v_test_p5;
  if v_status <> 'sold' then
    raise exception 'TEST 13b FAILED: cancelling a delivered order should leave painting as sold, got %', v_status;
  end if;

  raise notice 'PASS 13: cancelling a delivered order preserves sold status for paintings';

  ---------------------------------------------------------------------------
  -- 14. Store-wide burst cap (20 orders in last 60 minutes throws ATL04)
  ---------------------------------------------------------------------------
  reset role;
  -- Seed 20 dummy orders in the last 60 minutes
  insert into public.orders (
    reference, payment_method, customer_name, customer_phone, city, address, total_pkr, status, created_at
  )
  select
    'ATL-T' || lpad(i::text, 5, '0'),
    'cod',
    'Store Cap Test',
    '+92345' || lpad(i::text, 7, '0'),
    'Karachi',
    'Test Street',
    50000,
    'pending',
    now()
  from generate_series(1, 20) as i;

  -- Attempting place_order now must raise RATE_LIMITED / ATL04 with specific detail
  set local role anon;
  set local "request.jwt.claims" = '{"role": "anon"}';

  v_passed := false;
  v_err_detail := '';
  begin
    perform public.place_order(
      array[v_test_p6],
      jsonb_build_object(
        'name', 'Burst Visitor',
        'phone', '+923999999999',
        'city', 'Multan',
        'address', 'Cantt'
      ),
      'cod'
    );
  exception when others then
    if SQLSTATE = 'ATL04' then
      get stacked diagnostics v_err_detail = pg_exception_detail;
      if v_err_detail = 'Store is busy, please try again shortly.' then
        v_passed := true;
      end if;
    end if;
  end;

  -- Clean up dummy burst orders
  reset role;
  delete from public.orders where reference like 'ATL-T%';

  if not v_passed then
    raise exception 'TEST 14 FAILED: store-wide 20 orders/hour burst cap did not raise ATL04 with expected detail (detail: %)', v_err_detail;
  end if;

  raise notice 'PASS 14: store-wide burst cap (>= 20 orders in 60m) throws ATL04 with detail ''Store is busy, please try again shortly.''';

  ---------------------------------------------------------------------------
  -- 15. release_stale_reservations: security definer, admin only, releases reservations
  ---------------------------------------------------------------------------
  -- 15a. anon execution is rejected (permission denied)
  set local role anon;
  set local "request.jwt.claims" = '{"role": "anon"}';

  v_passed := false;
  begin
    perform public.release_stale_reservations(48);
  exception when insufficient_privilege then
    v_passed := true;
  end;
  if not v_passed then
    raise exception 'TEST 15a FAILED: anon was able to execute release_stale_reservations';
  end if;

  -- 15b. authenticated non-admin is rejected (NOT_AUTHORIZED / 42501)
  set local role authenticated;
  set local "request.jwt.claims" = '{"sub": "00000000-0000-0000-0000-000000000099", "role": "authenticated"}';
  set local "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000099';

  v_passed := false;
  begin
    perform public.release_stale_reservations(48);
  exception when others then
    if SQLSTATE = '42501' then
      v_passed := true;
    end if;
  end;
  if not v_passed then
    raise exception 'TEST 15b FAILED: non-admin was able to execute release_stale_reservations without 42501';
  end if;

  -- 15c. admin execution cancels stale pending orders and releases paintings
  reset role;
  -- Set up admin row safely
  begin
    insert into auth.users (id, aud, role, email)
    values (v_admin_uuid, 'authenticated', 'authenticated', 'admin-test@theatelier.internal')
    on conflict (id) do nothing;
  exception when others then
    set local session_replication_role = 'replica';
  end;
  insert into public.admins (user_id) values (v_admin_uuid) on conflict do nothing;
  set local session_replication_role = 'origin';

  -- Age v_order3_id (pending, v_test_p4 is reserved) past 48 hours
  update public.orders
     set created_at = now() - interval '50 hours'
   where id = v_order3_id;

  -- Call as admin
  set local role authenticated;
  set local "request.jwt.claims" = jsonb_build_object('sub', v_admin_uuid::text, 'role', 'authenticated')::text;
  set local "request.jwt.claim.sub" = v_admin_uuid::text;

  v_stale_count := public.release_stale_reservations(48);
  if v_stale_count < 1 then
    raise exception 'TEST 15c FAILED: release_stale_reservations returned % (expected >= 1)', v_stale_count;
  end if;

  -- Verify v_order3_id is now cancelled and v_test_p4 returned to available
  reset role;
  select status into v_status from public.orders where id = v_order3_id;
  if v_status <> 'cancelled' then
    raise exception 'TEST 15d FAILED: stale order was not cancelled (status is %)', v_status;
  end if;

  select status into v_status from public.paintings where id = v_test_p4;
  if v_status <> 'available' then
    raise exception 'TEST 15e FAILED: stale order painting was not released to available (status is %)', v_status;
  end if;

  raise notice 'PASS 15: release_stale_reservations rejects anon & non-admin, and admin call cancels stale pending orders & frees paintings';

  ---------------------------------------------------------------------------
  -- 16. order_items: UPDATE privilege is completely revoked, admin can SELECT
  ---------------------------------------------------------------------------
  -- Admin attempting UPDATE on order_items must fail with insufficient_privilege
  set local role authenticated;
  set local "request.jwt.claims" = jsonb_build_object('sub', v_admin_uuid::text, 'role', 'authenticated')::text;
  set local "request.jwt.claim.sub" = v_admin_uuid::text;

  v_passed := false;
  begin
    update public.order_items set price_snapshot_pkr = 1 where true;
  exception when insufficient_privilege then
    v_passed := true;
  end;
  if not v_passed then
    raise exception 'TEST 16a FAILED: authenticated/admin was able to UPDATE order_items';
  end if;

  -- Admin CAN SELECT order_items
  v_passed := false;
  begin
    select count(*) into v_admin_oi_count from public.order_items;
    v_passed := true;
  exception when others then
    v_passed := false;
  end;
  if not v_passed or v_admin_oi_count < 1 then
    raise exception 'TEST 16b FAILED: admin could not SELECT from order_items';
  end if;

  raise notice 'PASS 16: order_items UPDATE is revoked per least privilege, admin SELECT succeeds';

  raise notice '=======================================================';
  raise notice 'ALL 16 SECURITY & RLS TESTS PASSED SUCCESSFULLY';
  raise notice '=======================================================';
end $$;

rollback;
