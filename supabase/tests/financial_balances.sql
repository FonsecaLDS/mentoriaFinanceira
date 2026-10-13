begin;
select plan(26);

insert into auth.users (id, aud, role, email, email_confirmed_at, created_at, updated_at)
values ('80000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'balance-owner@example.com', now(), now(), now());
set local role authenticated;
select set_config('request.jwt.claim.sub', '80000000-0000-4000-8000-000000000001', true);
select public.create_tenant('Balances A', 'balances-a');
select set_config('test.tenant', (select id::text from public.tenants where slug = 'balances-a'), true);
insert into public.accounts (tenant_id, name, type, currency, opening_balance, opening_date)
values
  (current_setting('test.tenant')::uuid, 'Carteira principal', 'checking',  'BRL', 1000, current_date),
  (current_setting('test.tenant')::uuid, 'Poupança',           'savings',   'BRL',    0, current_date),
  (current_setting('test.tenant')::uuid, 'Benefício VA',        'benefit',   'BRL',  100, current_date),
  (current_setting('test.tenant')::uuid, 'Conta dólar',         'checking',  'USD',   50, current_date);
select set_config('test.account', (select id::text from public.accounts where name = 'Carteira principal'), true);
select set_config('test.savings', (select id::text from public.accounts where name = 'Poupança'), true);
select set_config('test.benefit', (select id::text from public.accounts where name = 'Benefício VA'), true);
select set_config('test.usd', (select id::text from public.accounts where name = 'Conta dólar'), true);
select is((select balance from public.get_account_balance(current_setting('test.account')::uuid)), 1000.0000::numeric, 'opening balance is the initial account balance');
select lives_ok($$insert into public.transactions (tenant_id, type, description, amount, currency, account_id, competence_date, due_date, status, created_by) values (current_setting('test.tenant')::uuid, 'income', 'Receita confirmada', 500, 'BRL', current_setting('test.account')::uuid, current_date, current_date, 'planned', auth.uid())$$, 'creates income obligation');
select set_config('test.income', (select id::text from public.transactions where description = 'Receita confirmada'), true);
select lives_ok($$select public.settle_transaction(current_setting('test.income')::uuid, current_setting('test.account')::uuid, 500, now(), 'balance-income-0001')$$, 'confirms income');
select lives_ok($$insert into public.transactions (tenant_id, type, description, amount, currency, account_id, competence_date, due_date, status, created_by) values (current_setting('test.tenant')::uuid, 'expense', 'Despesa confirmada', 200, 'BRL', current_setting('test.account')::uuid, current_date, current_date, 'planned', auth.uid())$$, 'creates expense obligation');
select set_config('test.expense', (select id::text from public.transactions where description = 'Despesa confirmada'), true);
select lives_ok($$select public.settle_transaction(current_setting('test.expense')::uuid, current_setting('test.account')::uuid, 200, now(), 'balance-expense-0001')$$, 'confirms expense');
select is((select balance from public.get_account_balance(current_setting('test.account')::uuid)), 1300.0000::numeric, 'confirmed movements update account balance');
select lives_ok($$select public.create_transfer(current_setting('test.account')::uuid, current_setting('test.savings')::uuid, 300, 'BRL', now(), 'Balance transfer', 'balance-transfer-0001')$$, 'creates internal transfer');
select is((select balance from public.get_account_balance(current_setting('test.account')::uuid)), 1000.0000::numeric, 'transfer debits source balance');
select is((select balance from public.get_account_balance(current_setting('test.savings')::uuid)), 300.0000::numeric, 'transfer credits destination balance');
select is((select sum(balance) from public.get_account_balances(current_setting('test.tenant')::uuid) where currency = 'BRL'), 1400.0000::numeric, 'transfer preserves consolidated BRL balance');
select is((select income from public.get_cash_result(current_setting('test.tenant')::uuid, current_date - 1, current_date + 30, 'BRL')), 500.0000::numeric, 'cash income uses confirmed settlements');
select is((select expense from public.get_cash_result(current_setting('test.tenant')::uuid, current_date - 1, current_date + 30, 'BRL')), 200.0000::numeric, 'cash expense uses confirmed settlements');
select is((select result from public.get_cash_result(current_setting('test.tenant')::uuid, current_date - 1, current_date + 30, 'BRL')), 300.0000::numeric, 'cash result excludes opening and transfers');
select lives_ok($$insert into public.transactions (tenant_id, type, description, amount, currency, account_id, competence_date, due_date, status, created_by) values (current_setting('test.tenant')::uuid, 'income', 'Receita prevista', 400, 'BRL', current_setting('test.account')::uuid, current_date, current_date + 10, 'planned', auth.uid())$$, 'creates planned income');
select lives_ok($$insert into public.transactions (tenant_id, type, description, amount, currency, account_id, competence_date, due_date, status, created_by) values (current_setting('test.tenant')::uuid, 'expense', 'Despesa pendente', 100, 'BRL', current_setting('test.account')::uuid, current_date, current_date + 10, 'pending', auth.uid())$$, 'creates pending expense');
select is((select income from public.get_accrual_result(current_setting('test.tenant')::uuid, current_date - 1, current_date + 30, 'BRL')), 900.0000::numeric, 'accrual income uses competence');
select is((select expense from public.get_accrual_result(current_setting('test.tenant')::uuid, current_date - 1, current_date + 30, 'BRL')), 300.0000::numeric, 'accrual expense uses competence');
select is((select result from public.get_accrual_result(current_setting('test.tenant')::uuid, current_date - 1, current_date + 30, 'BRL')), 600.0000::numeric, 'accrual result is independent of payment date');
select is((select current_balance from public.get_projected_balance(current_setting('test.account')::uuid)), 1000.0000::numeric, 'projected balance starts with effective balance');
select is((select projected_balance from public.get_projected_balance(current_setting('test.account')::uuid)), 1300.0000::numeric, 'projected balance applies future pending amounts');
select is((select available_balance from public.get_financial_summary(current_setting('test.tenant')::uuid, current_date - 1, current_date + 30) where currency = 'BRL'), 1300.0000::numeric, 'available balance excludes benefit account');
select is((select restricted_balance from public.get_financial_summary(current_setting('test.tenant')::uuid, current_date - 1, current_date + 30) where currency = 'BRL'), 100.0000::numeric, 'benefit balance remains restricted');
select lives_ok($$select public.reverse_transaction_settlement((select id from public.transaction_settlements where idempotency_key = 'balance-expense-0001'), 'balance-expense-reversal-01')$$, 'reverses confirmed expense');
select is((select balance from public.get_account_balance(current_setting('test.account')::uuid)), 1200.0000::numeric, 'reversal is included without deleting history');
select is((select expense from public.get_cash_result(current_setting('test.tenant')::uuid, current_date - 1, current_date + 30, 'BRL')), 0.0000::numeric, 'reversed settlement leaves no cash expense');
select is((select balance from public.get_account_balance(current_setting('test.usd')::uuid)), 50.0000::numeric, 'different currencies stay separate');

select * from finish();
rollback;
