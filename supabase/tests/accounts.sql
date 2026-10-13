begin;
select plan(23);

insert into auth.users (id, aud, role, email, email_confirmed_at, created_at, updated_at) values
  ('50000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'account-owner@example.com', now(), now(), now()),
  ('50000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'account-editor@example.com', now(), now(), now()),
  ('50000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'account-viewer@example.com', now(), now(), now());
set local role authenticated;
select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000001', true);
select public.create_tenant('Accounts A', 'accounts-a');
select set_config('test.tenant_a', (select id::text from public.tenants where slug = 'accounts-a'), true);
select public.create_tenant('Accounts B', 'accounts-b');
select set_config('test.tenant_b', (select id::text from public.tenants where slug = 'accounts-b'), true);
set local role postgres;
insert into public.tenant_members (tenant_id, user_id, role) values
  (current_setting('test.tenant_a')::uuid, '50000000-0000-0000-0000-000000000002', 'editor'),
  (current_setting('test.tenant_a')::uuid, '50000000-0000-0000-0000-000000000003', 'viewer');
set local role authenticated;

select ok((select relrowsecurity from pg_class where oid = 'public.accounts'::regclass), 'accounts has RLS');
select ok(not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'accounts' and column_name = 'current_balance'), 'current balance is not stored');
select lives_ok($$insert into public.accounts (tenant_id, name, type, currency, opening_balance, opening_date) values (current_setting('test.tenant_a')::uuid, '  Corrente  ', 'checking', 'brl', -10.1250, current_date)$$, 'owner creates checking account');
select lives_ok($$insert into public.accounts (tenant_id, name, type, currency, opening_balance, opening_date) values (current_setting('test.tenant_a')::uuid, 'Benefício', 'benefit', 'BRL', 0, current_date)$$, 'owner creates benefit account');
select throws_ok($$insert into public.accounts (tenant_id, name, type, currency, opening_balance, opening_date) values (current_setting('test.tenant_a')::uuid, 'CORRENTE', 'checking', 'BRL', 0, current_date)$$, '23505', null, 'normalized account names are unique');
select throws_ok($$insert into public.accounts (tenant_id, name, type, currency, opening_balance, opening_date) values (current_setting('test.tenant_a')::uuid, 'Future', 'cash', 'BRL', 0, current_date + 1)$$, 'P0001', null, 'future opening date is rejected');
select throws_ok($$insert into public.accounts (tenant_id, name, type, currency, opening_balance, opening_date) values (current_setting('test.tenant_a')::uuid, 'Bad currency', 'cash', 'BRL$', 0, current_date)$$, '22001', null, 'currency length is validated');
select set_config('test.account_id', (select id::text from public.accounts where tenant_id = current_setting('test.tenant_a')::uuid and name_normalized = 'corrente'), true);
select is((select opening_balance from public.accounts where id = current_setting('test.account_id')::uuid), -10.1250::numeric, 'opening balance preserves exact decimal');
select lives_ok($$update public.accounts set name = 'Conta principal', institution_name = 'Banco' where id = current_setting('test.account_id')::uuid$$, 'owner edits account metadata');
select lives_ok($$update public.accounts set is_active = false where id = current_setting('test.account_id')::uuid$$, 'owner archives account');
select is((select archived_at is not null from public.accounts where id = current_setting('test.account_id')::uuid), true, 'archive timestamp is set');
select lives_ok($$update public.accounts set is_active = true where id = current_setting('test.account_id')::uuid$$, 'owner reactivates account');
select is((select archived_at from public.accounts where id = current_setting('test.account_id')::uuid), null::timestamptz, 'reactivation clears archive timestamp');
select is((select count(*) from public.audit_logs where resource_type = 'account' and resource_id = current_setting('test.account_id')::uuid), 4::bigint, 'account changes are audited');
select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000002', true);
select lives_ok($$insert into public.accounts (tenant_id, name, type, currency, opening_balance, opening_date) values (current_setting('test.tenant_a')::uuid, 'Poupança', 'savings', 'BRL', 100, current_date)$$, 'editor creates account');
select lives_ok($$insert into public.accounts (tenant_id, name, type, currency, opening_balance, opening_date) values (current_setting('test.tenant_a')::uuid, 'Editor account', 'cash', 'BRL', 0, current_date)$$, 'editor creates another account');
select is((select count(*) from public.accounts where tenant_id = current_setting('test.tenant_b')::uuid), 0::bigint, 'tenant B starts isolated');
select is((select count(*) from public.accounts where tenant_id = current_setting('test.tenant_a')::uuid), 4::bigint, 'tenant A sees only its accounts');
select ok(not has_table_privilege('authenticated', 'public.accounts', 'DELETE'), 'application role cannot delete accounts');
select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000003', true);
select lives_ok($$update public.accounts set name = 'Nope' where tenant_id = current_setting('test.tenant_a')::uuid$$, 'viewer update is safely ignored by RLS');
select is((select count(*) from public.accounts where tenant_id = current_setting('test.tenant_a')::uuid and name_normalized = 'nope'), 0::bigint, 'viewer cannot edit accounts');
select throws_ok($$insert into public.accounts (tenant_id, name, type, currency, opening_balance, opening_date) values (current_setting('test.tenant_a')::uuid, 'Viewer account', 'cash', 'BRL', 0, current_date)$$, '42501', null, 'viewer cannot create accounts');
select is((select count(*) from public.accounts where tenant_id = current_setting('test.tenant_b')::uuid), 0::bigint, 'viewer cannot read another tenant');
select * from finish();
rollback;
