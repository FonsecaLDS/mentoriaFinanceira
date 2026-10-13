begin;
select plan(17);

insert into auth.users (id, aud, role, email, email_confirmed_at, created_at, updated_at)
values
  ('a3500000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'chart-owner@example.com', now(), now(), now()),
  ('a3500000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'chart-viewer@example.com', now(), now(), now());
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a3500000-0000-4000-8000-000000000001', true);
select public.create_tenant('Chart A', 'chart-a');
select set_config('test.tenant_a', (select id::text from public.tenants where slug = 'chart-a'), true);
select public.create_tenant('Chart B', 'chart-b');
select set_config('test.tenant_b', (select id::text from public.tenants where slug = 'chart-b'), true);
set local role postgres;
insert into public.tenant_members (tenant_id, user_id, role)
values (current_setting('test.tenant_a')::uuid, 'a3500000-0000-4000-8000-000000000002', 'viewer');
insert into public.accounts (tenant_id, name, type, currency, opening_date)
values
  (current_setting('test.tenant_a')::uuid, 'Conta gráfico', 'checking', 'BRL', current_date),
  (current_setting('test.tenant_a')::uuid, 'Conta secundária', 'savings', 'BRL', current_date),
  (current_setting('test.tenant_b')::uuid, 'Conta B', 'checking', 'BRL', current_date);
select set_config('test.account', (select id::text from public.accounts where name = 'Conta gráfico'), true);
select set_config('test.secondary', (select id::text from public.accounts where name = 'Conta secundária'), true);
insert into public.transactions (tenant_id, type, description, amount, currency, account_id, competence_date, due_date, status, created_by)
values
  (current_setting('test.tenant_a')::uuid, 'income', 'Gráfico receita caixa', 100, 'BRL', current_setting('test.account')::uuid, current_date - 2, current_date - 2, 'planned', 'a3500000-0000-4000-8000-000000000001'),
  (current_setting('test.tenant_a')::uuid, 'expense', 'Gráfico despesa caixa', 25, 'BRL', current_setting('test.account')::uuid, current_date, current_date, 'planned', 'a3500000-0000-4000-8000-000000000001'),
  (current_setting('test.tenant_a')::uuid, 'income', 'Gráfico receita outra conta', 50, 'BRL', current_setting('test.secondary')::uuid, current_date - 1, current_date - 1, 'planned', 'a3500000-0000-4000-8000-000000000001'),
  (current_setting('test.tenant_a')::uuid, 'income', 'Gráfico competência', 70, 'BRL', current_setting('test.account')::uuid, current_date - 1, current_date - 1, 'planned', 'a3500000-0000-4000-8000-000000000001'),
  (current_setting('test.tenant_a')::uuid, 'expense', 'Gráfico competência despesa', 30, 'BRL', current_setting('test.account')::uuid, current_date, current_date, 'pending', 'a3500000-0000-4000-8000-000000000001');
select set_config('test.income', (select id::text from public.transactions where description = 'Gráfico receita caixa'), true);
select set_config('test.expense', (select id::text from public.transactions where description = 'Gráfico despesa caixa'), true);
select set_config('test.other_income', (select id::text from public.transactions where description = 'Gráfico receita outra conta'), true);
set local role authenticated;
select public.settle_transaction(current_setting('test.income')::uuid, current_setting('test.account')::uuid, 100, ((current_date - 2)::text || ' 12:00:00Z')::timestamptz, 'chart-cash-income-001');
select public.settle_transaction(current_setting('test.expense')::uuid, current_setting('test.account')::uuid, 25, (current_date::text || ' 12:00:00Z')::timestamptz, 'chart-cash-expense-001');
select public.settle_transaction(current_setting('test.other_income')::uuid, current_setting('test.secondary')::uuid, 50, ((current_date - 1)::text || ' 12:00:00Z')::timestamptz, 'chart-cash-other-001');

select ok((select relrowsecurity from pg_class where oid = 'public.transactions'::regclass), 'dashboard source transactions have RLS');
select lives_ok($$select * from public.get_cash_flow_series(current_setting('test.tenant_a')::uuid, current_date - 2, current_date, current_setting('test.account')::uuid, 'BRL', 'cash', 'day')$$, 'cash daily series accepts tenant and account filters');
select is((select count(*) from public.get_cash_flow_series(current_setting('test.tenant_a')::uuid, current_date - 2, current_date, current_setting('test.account')::uuid, 'BRL', 'cash', 'day')), 3::bigint, 'daily series fills periods without movement');
select is((select sum(income) from public.get_cash_flow_series(current_setting('test.tenant_a')::uuid, current_date - 2, current_date, current_setting('test.account')::uuid, 'BRL', 'cash', 'day')), 100::numeric, 'cash series uses confirmed income');
select is((select sum(expense) from public.get_cash_flow_series(current_setting('test.tenant_a')::uuid, current_date - 2, current_date, current_setting('test.account')::uuid, 'BRL', 'cash', 'day')), 25::numeric, 'cash series uses confirmed expense');
select is((select result from public.get_cash_flow_series(current_setting('test.tenant_a')::uuid, current_date - 2, current_date, current_setting('test.account')::uuid, 'BRL', 'cash', 'day') order by period_start desc limit 1), -25::numeric, 'daily result preserves negative periods');
select is((select cumulative_result from public.get_cash_flow_series(current_setting('test.tenant_a')::uuid, current_date - 2, current_date, current_setting('test.account')::uuid, 'BRL', 'cash', 'day') order by period_start desc limit 1), 75::numeric, 'cumulative result is reconciled');
select is((select sum(income) from public.get_cash_flow_series(current_setting('test.tenant_a')::uuid, current_date - 2, current_date, current_setting('test.account')::uuid, 'BRL', 'cash', 'day')), 100::numeric, 'account filter excludes another account');
select is((select sum(income) from public.get_cash_flow_series(current_setting('test.tenant_a')::uuid, current_date - 2, current_date, null, 'BRL', 'cash', 'day')), 150::numeric, 'without account filter all same-currency accounts are included');
select is((select sum(income) from public.get_cash_flow_series(current_setting('test.tenant_a')::uuid, current_date - 2, current_date, current_setting('test.account')::uuid, 'BRL', 'competence', 'day')), 170::numeric, 'competence series uses transaction competence');
select is((select sum(expense) from public.get_cash_flow_series(current_setting('test.tenant_a')::uuid, current_date - 2, current_date, current_setting('test.account')::uuid, 'BRL', 'competence', 'day')), 55::numeric, 'competence series includes pending obligation');
select is((select count(*) from public.get_cash_flow_series(current_setting('test.tenant_a')::uuid, current_date - 2, current_date, current_setting('test.account')::uuid, 'BRL', 'cash', 'week')), 1::bigint, 'weekly granularity groups periods');
select is((select count(*) from public.get_cash_flow_series(current_setting('test.tenant_a')::uuid, current_date - 2, current_date, current_setting('test.account')::uuid, 'BRL', 'cash', 'month')), 1::bigint, 'monthly granularity groups periods');
select is((select count(*) from public.get_cash_flow_series(current_setting('test.tenant_a')::uuid, current_date - 20, current_date - 10, current_setting('test.account')::uuid, 'BRL', 'cash', 'day')), 0::bigint, 'empty period returns no fabricated currency series');
select throws_ok($$select * from public.get_cash_flow_series(current_setting('test.tenant_a')::uuid, current_date - 1, current_date, null, 'BRL', 'cash', 'quarter')$$, 'P0001', null, 'invalid granularity is rejected');
select set_config('request.jwt.claim.sub', 'a3500000-0000-4000-8000-000000000002', true);
select throws_ok($$select * from public.get_cash_flow_series(current_setting('test.tenant_b')::uuid, current_date - 1, current_date, null, 'BRL', 'cash', 'day')$$, 'P0001', null, 'cross tenant dashboard query is rejected');
select lives_ok($$select * from public.get_cash_flow_series(current_setting('test.tenant_a')::uuid, current_date - 1, current_date, null, 'BRL', 'cash', 'day')$$, 'viewer can read authorized dashboard data');
select * from finish();
rollback;
