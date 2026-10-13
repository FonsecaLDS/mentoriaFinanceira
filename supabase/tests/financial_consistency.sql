begin;
select plan(32);

insert into auth.users (id, aud, role, email, email_confirmed_at, created_at, updated_at)
values
  ('a3000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'consistency-owner@example.com', now(), now(), now()),
  ('a3000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'consistency-viewer@example.com', now(), now(), now());
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a3000000-0000-4000-8000-000000000001', true);
select public.create_tenant('Consistency A', 'consistency-a');
select set_config('test.tenant_a', (select id::text from public.tenants where slug = 'consistency-a'), true);
select public.create_tenant('Consistency B', 'consistency-b');
select set_config('test.tenant_b', (select id::text from public.tenants where slug = 'consistency-b'), true);
set local role postgres;
insert into public.tenant_members (tenant_id, user_id, role)
values (current_setting('test.tenant_a')::uuid, 'a3000000-0000-4000-8000-000000000002', 'viewer');
insert into public.accounts (tenant_id, name, type, currency, opening_balance, opening_date)
values
  (current_setting('test.tenant_a')::uuid, 'Conta principal', 'checking', 'BRL', 1000, current_date),
  (current_setting('test.tenant_a')::uuid, 'Conta reserva', 'savings', 'BRL', 0, current_date),
  (current_setting('test.tenant_a')::uuid, 'Conta dólar', 'checking', 'USD', 50, current_date),
  (current_setting('test.tenant_b')::uuid, 'Conta B', 'checking', 'BRL', 500, current_date);
insert into public.categories (tenant_id, name, type)
values (current_setting('test.tenant_a')::uuid, 'Receita integrada', 'income'),
       (current_setting('test.tenant_a')::uuid, 'Despesa integrada', 'expense');
select set_config('test.account', (select id::text from public.accounts where name = 'Conta principal'), true);
select set_config('test.target', (select id::text from public.accounts where name = 'Conta reserva'), true);
select set_config('test.usd', (select id::text from public.accounts where name = 'Conta dólar'), true);
select set_config('test.category', (select id::text from public.categories where type = 'expense'), true);
set local role authenticated;

select ok((select relrowsecurity from pg_class where oid = 'public.account_movements'::regclass), 'account movements have RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.transactions'::regclass), 'transactions have RLS');
select is((select balance from public.get_account_balance(current_setting('test.account')::uuid)), 1000.0000::numeric, 'opening balance is the only initial balance');

set local role postgres;
insert into public.transactions (tenant_id, type, description, amount, currency, category_id, account_id, competence_date, due_date, status, created_by)
values (current_setting('test.tenant_a')::uuid, 'income', 'Receita integrada', 500, 'BRL', null, current_setting('test.account')::uuid, current_date, current_date, 'planned', 'a3000000-0000-4000-8000-000000000001');
select set_config('test.income', (select id::text from public.transactions where description = 'Receita integrada'), true);
insert into public.transactions (tenant_id, type, description, amount, currency, category_id, account_id, competence_date, due_date, status, created_by)
values (current_setting('test.tenant_a')::uuid, 'expense', 'Despesa integrada', 200, 'BRL', current_setting('test.category')::uuid, current_setting('test.account')::uuid, current_date, current_date, 'planned', 'a3000000-0000-4000-8000-000000000001');
select set_config('test.expense', (select id::text from public.transactions where description = 'Despesa integrada'), true);
insert into public.transactions (tenant_id, type, description, amount, currency, account_id, competence_date, due_date, status, created_by)
values (current_setting('test.tenant_a')::uuid, 'expense', 'Despesa prevista', 75, 'BRL', current_setting('test.account')::uuid, current_date, current_date + 5, 'planned', 'a3000000-0000-4000-8000-000000000001');
set local role authenticated;
select lives_ok($$select public.settle_transaction(current_setting('test.income')::uuid, current_setting('test.account')::uuid, 500, now(), 'consistency-income-001')$$, 'confirmed income creates one positive movement');
select lives_ok($$select public.settle_transaction(current_setting('test.expense')::uuid, current_setting('test.account')::uuid, 200, now(), 'consistency-expense-001')$$, 'confirmed expense creates one negative movement');
select is((select balance from public.get_account_balance(current_setting('test.account')::uuid)), 1300.0000::numeric, 'balance equals opening plus confirmed movements');
select is((select count(*) from public.account_movements where account_id = current_setting('test.account')::uuid), 2::bigint, 'planned expense creates no movement');
select is((select result from public.get_cash_result(current_setting('test.tenant_a')::uuid, current_date - 1, current_date + 10, 'BRL')), 300.0000::numeric, 'cash result excludes opening and planned values');

select lives_ok($$select public.create_transfer(current_setting('test.account')::uuid, current_setting('test.target')::uuid, 300, 'BRL', now(), 'Integrated transfer', 'consistency-transfer-001')$$, 'transfer creates paired movements');
select is((select sum(amount) from public.account_movements where transfer_id = (select id from public.transfers where idempotency_key = 'consistency-transfer-001')), 0.0000::numeric, 'transfer consolidated effect is zero');
select is((select result from public.get_cash_result(current_setting('test.tenant_a')::uuid, current_date - 1, current_date + 10, 'BRL')), 300.0000::numeric, 'transfer does not change cash result');
select lives_ok($$select public.create_transfer(current_setting('test.account')::uuid, current_setting('test.target')::uuid, 300, 'BRL', (select effective_at from public.transfers where idempotency_key = 'consistency-transfer-001'), 'Integrated transfer', 'consistency-transfer-001')$$, 'transfer replay is idempotent');
select is((select count(*) from public.account_movements where transfer_id = (select id from public.transfers where idempotency_key = 'consistency-transfer-001')), 2::bigint, 'transfer replay does not duplicate movements');

select public.create_financial_goal(current_setting('test.tenant_a')::uuid, 'Meta integrada', 250, 'BRL', current_date + 90);
select set_config('test.goal', (select id::text from public.financial_goals where name = 'Meta integrada'), true);
select public.create_financial_reserve(current_setting('test.tenant_a')::uuid, current_setting('test.goal')::uuid, 'Reserva integrada', 'BRL');
select set_config('test.reserve', (select id::text from public.financial_reserves where name = 'Reserva integrada'), true);
select lives_ok($$select public.allocate_to_reserve(current_setting('test.tenant_a')::uuid, current_setting('test.reserve')::uuid, current_setting('test.account')::uuid, 250, now(), 'consistency-allocation-001')$$, 'reserve allocation moves patrimony atomically');
select is(public.get_reserve_balance(current_setting('test.tenant_a')::uuid, current_setting('test.reserve')::uuid), 250.0000::numeric, 'reserve balance equals allocation');
select is((select count(*) from public.transactions where tenant_id = current_setting('test.tenant_a')::uuid), 3::bigint, 'reserve allocation does not create income or expense');
select is((select balance from public.get_account_balance(current_setting('test.account')::uuid)), 750.0000::numeric, 'allocation reduces free account balance once');
select is(public.get_goal_progress(current_setting('test.tenant_a')::uuid, current_setting('test.goal')::uuid), 100.0000::numeric, 'goal progress is capped at target');
select lives_ok($$select public.withdraw_from_reserve(current_setting('test.tenant_a')::uuid, current_setting('test.reserve')::uuid, current_setting('test.account')::uuid, 100, now(), 'consistency-withdrawal-001')$$, 'reserve withdrawal moves patrimony back atomically');
select is(public.get_reserve_balance(current_setting('test.tenant_a')::uuid, current_setting('test.reserve')::uuid), 150.0000::numeric, 'withdrawal reduces reserve balance');
select is((select balance from public.get_account_balance(current_setting('test.account')::uuid)), 850.0000::numeric, 'withdrawal restores free account balance once');
select is((select result from public.get_cash_result(current_setting('test.tenant_a')::uuid, current_date - 1, current_date + 10, 'BRL')), 300.0000::numeric, 'reserve operations do not change consumption result');
select lives_ok($$select public.allocate_to_reserve(current_setting('test.tenant_a')::uuid, current_setting('test.reserve')::uuid, current_setting('test.account')::uuid, 250, now(), 'consistency-allocation-001')$$, 'allocation replay is idempotent');
select is((select count(*) from public.reserve_movements where reserve_id = current_setting('test.reserve')::uuid), 2::bigint, 'reserve replay does not duplicate movements');
select throws_ok($$select public.withdraw_from_reserve(current_setting('test.tenant_a')::uuid, current_setting('test.reserve')::uuid, current_setting('test.account')::uuid, 151, now(), 'consistency-withdrawal-over')$$, 'P0001', null, 'over-withdrawal rolls back');
select is(public.get_reserve_balance(current_setting('test.tenant_a')::uuid, current_setting('test.reserve')::uuid), 150.0000::numeric, 'failed withdrawal leaves reserve unchanged');
select throws_ok($$select public.allocate_to_reserve(current_setting('test.tenant_a')::uuid, current_setting('test.reserve')::uuid, current_setting('test.account')::uuid, 851, now(), 'consistency-allocation-over')$$, 'P0001', null, 'allocation over available account balance rolls back');
select is((select count(*) from public.account_movements where tenant_id = current_setting('test.tenant_a')::uuid), 6::bigint, 'failed reserve operation leaves no partial movement');
select is((select sum(balance) from public.get_account_balances(current_setting('test.tenant_a')::uuid) where currency = 'BRL') + public.get_reserve_balance(current_setting('test.tenant_a')::uuid, current_setting('test.reserve')::uuid), 1300.0000::numeric, 'account plus reserve preserves total patrimony');
select throws_ok($$select public.allocate_to_reserve(current_setting('test.tenant_a')::uuid, current_setting('test.reserve')::uuid, current_setting('test.usd')::uuid, 1, now(), 'consistency-currency-cross')$$, 'P0001', null, 'different currencies are not combined');
select set_config('request.jwt.claim.sub', 'a3000000-0000-4000-8000-000000000002', true);
select is((select count(*) from public.transactions where tenant_id = current_setting('test.tenant_b')::uuid), 0::bigint, 'viewer cannot read another tenant');
select throws_ok($$select public.withdraw_from_reserve(current_setting('test.tenant_a')::uuid, current_setting('test.reserve')::uuid, current_setting('test.account')::uuid, 1, now(), 'consistency-viewer-write')$$, 'P0001', null, 'viewer cannot mutate reserves');
select * from finish();
rollback;
