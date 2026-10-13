begin;
select plan(22);

insert into auth.users (id, aud, role, email, email_confirmed_at, created_at, updated_at) values
  ('70000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'transfer-owner@example.com', now(), now(), now()),
  ('70000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'transfer-viewer@example.com', now(), now(), now());
set local role authenticated;
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000001', true);
select public.create_tenant('Transfers A', 'transfers-a');
select set_config('test.tenant_a', (select id::text from public.tenants where slug = 'transfers-a'), true);
select public.create_tenant('Transfers B', 'transfers-b');
select set_config('test.tenant_b', (select id::text from public.tenants where slug = 'transfers-b'), true);
set local role postgres;
insert into public.tenant_members (tenant_id, user_id, role) values
  (current_setting('test.tenant_a')::uuid, '70000000-0000-4000-8000-000000000002', 'viewer');
insert into public.accounts (tenant_id, name, type, currency, opening_balance, opening_date) values
  (current_setting('test.tenant_a')::uuid, 'Origem', 'checking', 'BRL', 500, current_date),
  (current_setting('test.tenant_a')::uuid, 'Destino', 'savings', 'BRL', 100, current_date),
  (current_setting('test.tenant_a')::uuid, 'Dólar', 'checking', 'USD', 0, current_date),
  (current_setting('test.tenant_b')::uuid, 'Outro tenant', 'checking', 'BRL', 0, current_date);
select set_config('test.source', (select id::text from public.accounts where name = 'Origem'), true);
select set_config('test.target', (select id::text from public.accounts where name = 'Destino'), true);
select set_config('test.usd', (select id::text from public.accounts where name = 'Dólar'), true);
select set_config('test.other', (select id::text from public.accounts where name = 'Outro tenant'), true);
set local role authenticated;

select ok((select relrowsecurity from pg_class where oid = 'public.transfers'::regclass), 'transfers has RLS');
select ok(not has_table_privilege('authenticated', 'public.transfers', 'INSERT'), 'transfers cannot be inserted directly');
select lives_ok($$select public.create_transfer(current_setting('test.source')::uuid, current_setting('test.target')::uuid, 125.5000, 'BRL', now(), 'Reserva', 'transfer-idempotency-01')$$, 'creates transfer atomically');
select is((select count(*) from public.transfers where tenant_id = current_setting('test.tenant_a')::uuid), 1::bigint, 'stores one transfer');
select is((select count(*) from public.account_movements where transfer_id = (select id from public.transfers where idempotency_key = 'transfer-idempotency-01')), 2::bigint, 'stores two linked movements');
select is((select amount from public.account_movements where transfer_id = (select id from public.transfers where idempotency_key = 'transfer-idempotency-01') and account_id = current_setting('test.source')::uuid), -125.5000::numeric, 'debits source');
select is((select amount from public.account_movements where transfer_id = (select id from public.transfers where idempotency_key = 'transfer-idempotency-01') and account_id = current_setting('test.target')::uuid), 125.5000::numeric, 'credits target');
select is((select sum(amount) from public.account_movements where transfer_id = (select id from public.transfers where idempotency_key = 'transfer-idempotency-01')), 0.0000::numeric, 'movement sum is zero');
select is((select count(*) from public.transactions where tenant_id = current_setting('test.tenant_a')::uuid), 0::bigint, 'transfer is not a transaction');
select lives_ok($$select public.create_transfer(current_setting('test.source')::uuid, current_setting('test.target')::uuid, 125.5000, 'BRL', (select effective_at from public.transfers limit 1), 'Reserva', 'transfer-idempotency-01')$$, 'replay is idempotent');
select is((select count(*) from public.account_movements where transfer_id = (select id from public.transfers where idempotency_key = 'transfer-idempotency-01')), 2::bigint, 'replay does not duplicate movements');
select throws_ok($$select public.create_transfer(current_setting('test.source')::uuid, current_setting('test.source')::uuid, 1, 'BRL', now(), null, 'transfer-same-0001')$$, 'P0001', null, 'same account is rejected');
select throws_ok($$select public.create_transfer(current_setting('test.source')::uuid, current_setting('test.target')::uuid, 0, 'BRL', now(), null, 'transfer-zero-0001')$$, 'P0001', null, 'zero amount is rejected');
select throws_ok($$select public.create_transfer(current_setting('test.source')::uuid, current_setting('test.usd')::uuid, 1, 'BRL', now(), null, 'transfer-currency-01')$$, 'P0001', null, 'currency mismatch is rejected');
select throws_ok($$select public.create_transfer(current_setting('test.source')::uuid, current_setting('test.other')::uuid, 1, 'BRL', now(), null, 'transfer-cross-tenant')$$, 'P0001', null, 'cross tenant target is rejected');
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000002', true);
select throws_ok($$select public.create_transfer(current_setting('test.source')::uuid, current_setting('test.target')::uuid, 1, 'BRL', now(), null, 'transfer-viewer-0001')$$, 'P0001', null, 'viewer cannot create transfer');
select is((select count(*) from public.transfers where tenant_id = current_setting('test.tenant_b')::uuid), 0::bigint, 'viewer cannot read another tenant');
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000001', true);
select set_config('test.transfer_id', (select id::text from public.transfers where idempotency_key = 'transfer-idempotency-01'), true);
select lives_ok($$select public.reverse_transfer(current_setting('test.transfer_id')::uuid, 'transfer-reversal-0001')$$, 'reverses transfer with compensating movements');
select is((select count(*) from public.account_movements where reversal_of_id is not null), 2::bigint, 'reversal preserves both movement histories');
select is((select sum(amount) from public.account_movements where account_id = current_setting('test.source')::uuid), 0.0000::numeric, 'reversal restores source movement total');
select lives_ok($$select public.reverse_transfer(current_setting('test.transfer_id')::uuid, 'transfer-reversal-0001')$$, 'reversal is idempotent');
select is((select count(*) from public.audit_logs where resource_type = 'transfer' and tenant_id = current_setting('test.tenant_a')::uuid), 2::bigint, 'creation and reversal are audited');

select * from finish();
rollback;
