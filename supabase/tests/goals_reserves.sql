begin;
select plan(26);

insert into auth.users (id, aud, role, email, email_confirmed_at, created_at, updated_at) values
  ('97000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'goal-owner@example.com', now(), now(), now()),
  ('97000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'goal-viewer@example.com', now(), now(), now());
set local role authenticated;
select set_config('request.jwt.claim.sub', '97000000-0000-4000-8000-000000000001', true);
select public.create_tenant('Goals A', 'goals-a');
select set_config('test.tenant_a', (select id::text from public.tenants where slug = 'goals-a'), true);
select public.create_tenant('Goals B', 'goals-b');
select set_config('test.tenant_b', (select id::text from public.tenants where slug = 'goals-b'), true);
set local role postgres;
insert into public.tenant_members (tenant_id, user_id, role) values (current_setting('test.tenant_a')::uuid, '97000000-0000-4000-8000-000000000002', 'viewer');
insert into public.accounts (tenant_id, name, type, currency, opening_balance, opening_date) values
  (current_setting('test.tenant_a')::uuid, 'Conta A', 'checking', 'BRL', 1000, current_date),
  (current_setting('test.tenant_a')::uuid, 'Conta USD', 'checking', 'USD', 1000, current_date),
  (current_setting('test.tenant_b')::uuid, 'Conta B', 'checking', 'BRL', 1000, current_date);
select set_config('test.account', (select id::text from public.accounts where tenant_id = current_setting('test.tenant_a')::uuid and currency = 'BRL'), true);
select set_config('test.usd_account', (select id::text from public.accounts where tenant_id = current_setting('test.tenant_a')::uuid and currency = 'USD'), true);
set local role authenticated;

select ok((select relrowsecurity from pg_class where oid = 'public.financial_goals'::regclass), 'goals have RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.financial_reserves'::regclass), 'reserves have RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.reserve_movements'::regclass), 'reserve movements have RLS');
select ok(not has_table_privilege('authenticated', 'public.financial_goals', 'INSERT'), 'goals cannot be inserted directly');
select lives_ok($$select public.create_financial_goal(current_setting('test.tenant_a')::uuid, 'Reserva emergência', 1000, 'BRL', '2027-12-31')$$, 'creates goal');
select set_config('test.goal', (select id::text from public.financial_goals where tenant_id = current_setting('test.tenant_a')::uuid), true);
select lives_ok($$select public.create_financial_reserve(current_setting('test.tenant_a')::uuid, current_setting('test.goal')::uuid, 'Reserva emergência', 'BRL')$$, 'creates linked reserve');
select set_config('test.reserve', (select id::text from public.financial_reserves where tenant_id = current_setting('test.tenant_a')::uuid), true);
select lives_ok($$select public.update_financial_goal(current_setting('test.tenant_a')::uuid, current_setting('test.goal')::uuid, 'Reserva emergência', 1200, '2027-12-31', 'active')$$, 'updates goal');
select is((select target_amount from public.financial_goals where id = current_setting('test.goal')::uuid), 1200::numeric, 'goal target updated');
select lives_ok($$select public.allocate_to_reserve(current_setting('test.tenant_a')::uuid, current_setting('test.reserve')::uuid, current_setting('test.account')::uuid, 300, '2026-01-20T12:00:00Z', 'reserve-allocation-001')$$, 'allocates to reserve');
select is(public.get_reserve_balance(current_setting('test.tenant_a')::uuid, current_setting('test.reserve')::uuid), 300::numeric, 'reserve balance is effective');
select is((select amount from public.account_movements where reserve_movement_id = (select id from public.reserve_movements where idempotency_key = 'reserve-allocation-001')), -300::numeric, 'allocation reduces free account balance');
select is((select count(*) from public.transactions where tenant_id = current_setting('test.tenant_a')::uuid), 0::bigint, 'allocation does not create expense');
select is((select 1000 + coalesce(sum(amount), 0) from public.account_movements where account_id = current_setting('test.account')::uuid), 700::numeric, 'account balance decreases by allocation');
select lives_ok($$select public.allocate_to_reserve(current_setting('test.tenant_a')::uuid, current_setting('test.reserve')::uuid, current_setting('test.account')::uuid, 300, '2026-01-20T12:00:00Z', 'reserve-allocation-001')$$, 'allocation is idempotent');
select is((select count(*) from public.reserve_movements where reserve_id = current_setting('test.reserve')::uuid), 1::bigint, 'idempotency does not duplicate allocation');
select lives_ok($$select public.allocate_to_reserve(current_setting('test.tenant_a')::uuid, current_setting('test.reserve')::uuid, current_setting('test.account')::uuid, 200, '2026-01-21T12:00:00Z', 'reserve-allocation-002')$$, 'allocates second amount');
select is(public.get_goal_progress(current_setting('test.tenant_a')::uuid, current_setting('test.goal')::uuid), 41.6667::numeric, 'goal progress uses effective reserve balance');
select lives_ok($$select public.withdraw_from_reserve(current_setting('test.tenant_a')::uuid, current_setting('test.reserve')::uuid, current_setting('test.account')::uuid, 100, '2026-01-22T12:00:00Z', 'reserve-withdrawal-001')$$, 'withdraws from reserve');
select is(public.get_reserve_balance(current_setting('test.tenant_a')::uuid, current_setting('test.reserve')::uuid), 400::numeric, 'withdrawal reduces reserve balance');
select is((select amount from public.account_movements where reserve_movement_id = (select id from public.reserve_movements where idempotency_key = 'reserve-withdrawal-001')), 100::numeric, 'withdrawal restores free account balance');
select throws_ok($$select public.withdraw_from_reserve(current_setting('test.tenant_a')::uuid, current_setting('test.reserve')::uuid, current_setting('test.account')::uuid, 401, '2026-01-22T12:00:00Z', 'reserve-withdrawal-002')$$, 'P0001', null, 'over-withdrawal is rejected');
select is((select count(*) from public.reserve_movements where reserve_id = current_setting('test.reserve')::uuid), 3::bigint, 'failed withdrawal rolls back');
select throws_ok($$select public.allocate_to_reserve(current_setting('test.tenant_a')::uuid, current_setting('test.reserve')::uuid, current_setting('test.account')::uuid, 700, '2026-01-22T12:00:00Z', 'reserve-allocation-003')$$, 'P0001', null, 'allocation above free balance is rejected');
select throws_ok($$select public.create_financial_reserve(current_setting('test.tenant_a')::uuid, current_setting('test.goal')::uuid, 'Outra', 'USD')$$, 'P0001', null, 'goal and reserve currencies must match');
select throws_ok($$select public.withdraw_from_reserve(current_setting('test.tenant_b')::uuid, current_setting('test.reserve')::uuid, current_setting('test.account')::uuid, 1, '2026-01-22T12:00:00Z', 'reserve-withdrawal-003')$$, 'P0001', null, 'cross-tenant reserve is rejected');
select set_config('request.jwt.claim.sub', '97000000-0000-4000-8000-000000000002', true);
select throws_ok($$select public.withdraw_from_reserve(current_setting('test.tenant_a')::uuid, current_setting('test.reserve')::uuid, current_setting('test.account')::uuid, 1, '2026-01-22T12:00:00Z', 'reserve-withdrawal-004')$$, 'P0001', null, 'viewer cannot withdraw');
select * from finish();
rollback;
