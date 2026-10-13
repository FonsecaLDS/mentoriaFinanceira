begin;
select plan(41);

insert into auth.users (id, aud, role, email, email_confirmed_at, created_at, updated_at) values
  ('60000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'transaction-owner@example.com', now(), now(), now()),
  ('60000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'transaction-editor@example.com', now(), now(), now()),
  ('60000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'transaction-viewer@example.com', now(), now(), now());
set local role authenticated;
select set_config('request.jwt.claim.sub', '60000000-0000-0000-0000-000000000001', true);
select public.create_tenant('Transactions A', 'transactions-a');
select set_config('test.tenant_a', (select id::text from public.tenants where slug = 'transactions-a'), true);
select public.create_tenant('Transactions B', 'transactions-b');
select set_config('test.tenant_b', (select id::text from public.tenants where slug = 'transactions-b'), true);
set local role postgres;
insert into public.tenant_members (tenant_id, user_id, role) values
  (current_setting('test.tenant_a')::uuid, '60000000-0000-0000-0000-000000000002', 'editor'),
  (current_setting('test.tenant_a')::uuid, '60000000-0000-0000-0000-000000000003', 'viewer');
insert into public.accounts (tenant_id, name, type, currency, opening_date) values
  (current_setting('test.tenant_a')::uuid, 'Conta A', 'checking', 'BRL', current_date),
  (current_setting('test.tenant_b')::uuid, 'Conta B', 'checking', 'BRL', current_date);
insert into public.categories (tenant_id, name, type) values
  (current_setting('test.tenant_a')::uuid, 'Receita A', 'income'),
  (current_setting('test.tenant_a')::uuid, 'Despesa A', 'expense'),
  (current_setting('test.tenant_b')::uuid, 'Despesa B', 'expense');
select set_config('test.account_a', (select id::text from public.accounts where tenant_id = current_setting('test.tenant_a')::uuid), true);
select set_config('test.account_b', (select id::text from public.accounts where tenant_id = current_setting('test.tenant_b')::uuid), true);
select set_config('test.category_a', (select id::text from public.categories where tenant_id = current_setting('test.tenant_a')::uuid and type = 'expense'), true);
select set_config('test.category_b', (select id::text from public.categories where tenant_id = current_setting('test.tenant_b')::uuid), true);
set local role authenticated;

select ok((select relrowsecurity from pg_class where oid = 'public.transactions'::regclass), 'transactions has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.transaction_settlements'::regclass), 'settlements have RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.account_movements'::regclass), 'movements have RLS');
select ok(not has_table_privilege('authenticated', 'public.transaction_settlements', 'INSERT'), 'settlements cannot be inserted directly');
select lives_ok($$insert into public.transactions (tenant_id, type, description, amount, currency, category_id, account_id, competence_date, status, created_by) values (current_setting('test.tenant_a')::uuid, 'income', 'Salário', 100.0000, 'BRL', null, current_setting('test.account_a')::uuid, current_date, 'planned', auth.uid())$$, 'creates planned income');
select lives_ok($$insert into public.transactions (tenant_id, type, description, amount, currency, category_id, account_id, competence_date, status, created_by) values (current_setting('test.tenant_a')::uuid, 'expense', 'Despesa', 100.0000, 'BRL', current_setting('test.category_a')::uuid, current_setting('test.account_a')::uuid, current_date, 'pending', auth.uid())$$, 'creates pending expense');
select set_config('test.transaction_id', (select id::text from public.transactions where description = 'Despesa'), true);
select is((select count(*) from public.account_movements where tenant_id = current_setting('test.tenant_a')::uuid), 0::bigint, 'unsettled transaction creates no movement');
select throws_ok($$insert into public.transactions (tenant_id, type, description, amount, currency, competence_date, status, created_by) values (current_setting('test.tenant_a')::uuid, 'expense', 'Invalid paid', 1, 'BRL', current_date, 'paid', auth.uid())$$, 'P0001', null, 'paid status requires settlement');
select lives_ok($$select public.settle_transaction(current_setting('test.transaction_id')::uuid, current_setting('test.account_a')::uuid, 40.0000, now(), 'expense-settlement-0001')$$, 'records partial settlement atomically');
select is((select status from public.transactions where id = current_setting('test.transaction_id')::uuid), 'partially_paid', 'partial status is derived');
select is((select amount from public.account_movements where settlement_id = (select id from public.transaction_settlements where idempotency_key = 'expense-settlement-0001')), -40.0000::numeric, 'expense movement is negative');
select lives_ok($$select public.settle_transaction(current_setting('test.transaction_id')::uuid, current_setting('test.account_a')::uuid, 40.0000, now(), 'expense-settlement-0001')$$, 'same idempotency key is replay safe');
select is((select count(*) from public.transaction_settlements where transaction_id = current_setting('test.transaction_id')::uuid), 1::bigint, 'replay does not duplicate settlement');
select lives_ok($$select public.settle_transaction(current_setting('test.transaction_id')::uuid, current_setting('test.account_a')::uuid, 60.0000, now(), 'expense-settlement-0002')$$, 'records remaining settlement');
select is((select status from public.transactions where id = current_setting('test.transaction_id')::uuid), 'paid', 'full status is derived');
select is((select sum(amount) from public.account_movements where account_id = current_setting('test.account_a')::uuid), -100.0000::numeric, 'effective movement total is exact');
select throws_ok($$select public.settle_transaction(current_setting('test.transaction_id')::uuid, current_setting('test.account_a')::uuid, 1.0000, now(), 'expense-settlement-0003')$$, 'P0001', null, 'overpayment is rejected');
select is((select count(*) from public.account_movements where account_id = current_setting('test.account_a')::uuid), 2::bigint, 'failed overpayment leaves movements unchanged');
select set_config('test.settlement_one', (select id::text from public.transaction_settlements where idempotency_key = 'expense-settlement-0001'), true);
select set_config('test.settlement_two', (select id::text from public.transaction_settlements where idempotency_key = 'expense-settlement-0002'), true);
select set_config('request.jwt.claim.sub', '60000000-0000-0000-0000-000000000003', true);
select throws_ok($$select public.reverse_transaction_settlement(current_setting('test.settlement_two')::uuid, 'expense-reversal-viewer-01')$$, 'P0001', null, 'viewer cannot reverse settlement');
select set_config('request.jwt.claim.sub', '60000000-0000-0000-0000-000000000001', true);
select lives_ok($$select public.reverse_transaction_settlement(current_setting('test.settlement_two')::uuid, 'expense-reversal-0002')$$, 'reverses a settlement atomically');
select is((select status from public.transactions where id = current_setting('test.transaction_id')::uuid), 'partially_paid', 'reversing settlement restores partial status');
select is((select sum(amount) from public.account_movements where account_id = current_setting('test.account_a')::uuid), -40.0000::numeric, 'reversal compensates the effective movement');
select lives_ok($$select public.reverse_transaction_settlement(current_setting('test.settlement_two')::uuid, 'expense-reversal-0002')$$, 'reversal is idempotent');
select is((select count(*) from public.account_movements where reversal_of_id is not null), 1::bigint, 'idempotent reversal creates one compensating movement');
select lives_ok($$select public.reverse_transaction_settlement(current_setting('test.settlement_one')::uuid, 'expense-reversal-0001')$$, 'reverses the remaining settlement');
select is((select status from public.transactions where id = current_setting('test.transaction_id')::uuid), 'pending', 'reversing all settlements restores pending status');
select is((select sum(amount) from public.account_movements where account_id = current_setting('test.account_a')::uuid), 0.0000::numeric, 'all reversals restore the account movement total');
select lives_ok($$insert into public.transactions (tenant_id, type, description, amount, currency, competence_date, status, created_by) values (current_setting('test.tenant_a')::uuid, 'income', 'Recebimento', 25.0000, 'BRL', current_date, 'pending', auth.uid())$$, 'creates income');
select set_config('test.income_id', (select id::text from public.transactions where description = 'Recebimento'), true);
select lives_ok($$select public.settle_transaction(current_setting('test.income_id')::uuid, current_setting('test.account_a')::uuid, 25.0000, now(), 'income-settlement-0001')$$, 'settles income');
select is((select amount from public.account_movements where settlement_id = (select id from public.transaction_settlements where idempotency_key = 'income-settlement-0001')), 25.0000::numeric, 'income movement is positive');
select throws_ok($$select public.settle_transaction(current_setting('test.income_id')::uuid, current_setting('test.account_a')::uuid, 1.0000, now(), 'income-settlement-0002')$$, 'P0001', null, 'paid transaction cannot be overpaid');
select lives_ok($$insert into public.transactions (tenant_id, type, description, amount, currency, competence_date, status, created_by) values (current_setting('test.tenant_a')::uuid, 'expense', 'Dólar', 10, 'USD', current_date, 'pending', auth.uid())$$, 'creates foreign currency transaction');
select set_config('test.usd_id', (select id::text from public.transactions where description = 'Dólar'), true);
select throws_ok($$select public.settle_transaction(current_setting('test.usd_id')::uuid, current_setting('test.account_a')::uuid, 1.0000, now(), 'expense-currency-0001')$$, 'P0001', null, 'settlement currency must match account');
select lives_ok($$insert into public.transactions (tenant_id, type, description, amount, currency, competence_date, status, created_by) values (current_setting('test.tenant_a')::uuid, 'expense', 'Cancelável', 10, 'BRL', current_date, 'pending', auth.uid())$$, 'creates cancellable transaction');
select set_config('test.cancel_id', (select id::text from public.transactions where description = 'Cancelável'), true);
select lives_ok($$update public.transactions set status = 'cancelled' where id = current_setting('test.cancel_id')::uuid$$, 'cancels transaction without settlement');
select throws_ok($$update public.transactions set status = 'pending' where id = current_setting('test.cancel_id')::uuid$$, 'P0001', null, 'cancelled transaction cannot be reopened');
select set_config('request.jwt.claim.sub', '60000000-0000-0000-0000-000000000002', true);
select throws_ok($$insert into public.transactions (tenant_id, type, description, amount, currency, category_id, account_id, competence_date, status, created_by) values (current_setting('test.tenant_a')::uuid, 'expense', 'Cross category', 1, 'BRL', current_setting('test.category_b')::uuid, current_setting('test.account_a')::uuid, current_date, 'pending', auth.uid())$$, '23503', null, 'cross tenant category is rejected');
select throws_ok($$insert into public.transactions (tenant_id, type, description, amount, currency, category_id, account_id, competence_date, status, created_by) values (current_setting('test.tenant_a')::uuid, 'expense', 'Cross account', 1, 'BRL', current_setting('test.category_a')::uuid, current_setting('test.account_b')::uuid, current_date, 'pending', auth.uid())$$, '23503', null, 'cross tenant account is rejected');
select set_config('request.jwt.claim.sub', '60000000-0000-0000-0000-000000000003', true);
select throws_ok($$insert into public.transactions (tenant_id, type, description, amount, currency, competence_date, status, created_by) values (current_setting('test.tenant_a')::uuid, 'expense', 'Viewer', 1, 'BRL', current_date, 'pending', auth.uid())$$, '42501', null, 'viewer cannot create transaction');
select is((select count(*) from public.transactions where tenant_id = current_setting('test.tenant_b')::uuid), 0::bigint, 'viewer cannot read another tenant');
select ok((select count(*) from public.audit_logs where resource_type in ('transaction', 'transaction_settlement') and tenant_id = current_setting('test.tenant_a')::uuid) >= 7, 'transaction and settlement changes are audited');
select * from finish();
rollback;
