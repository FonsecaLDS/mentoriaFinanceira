begin;
select plan(22);

insert into auth.users (id, aud, role, email, email_confirmed_at, created_at, updated_at)
values ('90000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'planning-owner@example.com', now(), now(), now());
set local role authenticated;
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000001', true);
select public.create_tenant('Planning A', 'planning-a');
select set_config('test.tenant', (select id::text from public.tenants where slug = 'planning-a'), true);
insert into public.accounts (tenant_id, name, type, currency, opening_date) values (current_setting('test.tenant')::uuid, 'Conta planejamento', 'checking', 'BRL', current_date), (current_setting('test.tenant')::uuid, 'Conta destino', 'savings', 'BRL', current_date);
insert into public.categories (tenant_id, name, type) values (current_setting('test.tenant')::uuid, 'Receita planejamento', 'income'), (current_setting('test.tenant')::uuid, 'Despesa planejamento', 'expense');
insert into public.people (tenant_id, name) values (current_setting('test.tenant')::uuid, 'Pessoa planejamento');
select set_config('test.account', (select id::text from public.accounts where name = 'Conta planejamento'), true);
select set_config('test.target', (select id::text from public.accounts where name = 'Conta destino'), true);
select set_config('test.income_category', (select id::text from public.categories where type = 'income'), true);
select set_config('test.expense_category', (select id::text from public.categories where type = 'expense'), true);
select set_config('test.person', (select id::text from public.people where name = 'Pessoa planejamento'), true);

select ok((select relrowsecurity from pg_class where oid = 'public.monthly_plans'::regclass), 'monthly plans have RLS');
select ok(not has_table_privilege('authenticated', 'public.monthly_plan_items', 'INSERT'), 'planning items cannot be inserted directly');
select lives_ok($$select public.upsert_monthly_plan_item(current_setting('test.tenant')::uuid, extract(year from current_date)::smallint, extract(month from current_date)::smallint, 'income', 150, 'BRL', current_setting('test.income_category')::uuid, current_setting('test.account')::uuid, current_setting('test.person')::uuid)$$, 'creates planned income');
select lives_ok($$select public.upsert_monthly_plan_item(current_setting('test.tenant')::uuid, extract(year from current_date)::smallint, extract(month from current_date)::smallint, 'expense', 100, 'BRL', current_setting('test.expense_category')::uuid, current_setting('test.account')::uuid, current_setting('test.person')::uuid)$$, 'creates planned expense');
select lives_ok($$select public.upsert_monthly_plan_item(current_setting('test.tenant')::uuid, extract(year from current_date)::smallint, extract(month from current_date)::smallint, 'expense', 120, 'BRL', current_setting('test.expense_category')::uuid, current_setting('test.account')::uuid, current_setting('test.person')::uuid)$$, 'edits existing planned dimension');
select is((select count(*) from public.get_monthly_plan(current_setting('test.tenant')::uuid, extract(year from current_date)::smallint, extract(month from current_date)::smallint)), 2::bigint, 'period has one item per dimension');
select lives_ok($$insert into public.transactions (tenant_id, type, description, amount, currency, category_id, account_id, person_id, competence_date, due_date, status, created_by) values (current_setting('test.tenant')::uuid, 'income', 'Actual income', 200, 'BRL', current_setting('test.income_category')::uuid, current_setting('test.account')::uuid, current_setting('test.person')::uuid, current_date, current_date, 'planned', auth.uid())$$, 'creates actual income');
select set_config('test.income', (select id::text from public.transactions where description = 'Actual income'), true);
select lives_ok($$insert into public.transactions (tenant_id, type, description, amount, currency, category_id, account_id, person_id, competence_date, due_date, status, created_by) values (current_setting('test.tenant')::uuid, 'expense', 'Actual expense', 100, 'BRL', current_setting('test.expense_category')::uuid, current_setting('test.account')::uuid, current_setting('test.person')::uuid, current_date, current_date, 'planned', auth.uid())$$, 'creates actual expense');
select set_config('test.expense', (select id::text from public.transactions where description = 'Actual expense'), true);
select lives_ok($$select public.settle_transaction(current_setting('test.income')::uuid, current_setting('test.account')::uuid, 200, now(), 'planning-income-0001')$$, 'confirms income');
select lives_ok($$select public.settle_transaction(current_setting('test.expense')::uuid, current_setting('test.account')::uuid, 40, now(), 'planning-expense-0001')$$, 'confirms partial expense');
select is((select actual from public.get_monthly_comparison(current_setting('test.tenant')::uuid, extract(year from current_date)::smallint, extract(month from current_date)::smallint, 'competence', current_setting('test.expense_category')::uuid) where type = 'expense'), 100.0000::numeric, 'competence uses full obligation');
select is((select actual from public.get_monthly_comparison(current_setting('test.tenant')::uuid, extract(year from current_date)::smallint, extract(month from current_date)::smallint, 'cash', current_setting('test.expense_category')::uuid) where type = 'expense'), 40.0000::numeric, 'cash uses only confirmed partial payment');
select is((select planned_expense from public.get_monthly_summary(current_setting('test.tenant')::uuid, extract(year from current_date)::smallint, extract(month from current_date)::smallint, 'cash')), 120.0000::numeric, 'summary reflects latest plan');
select is((select actual_income from public.get_monthly_summary(current_setting('test.tenant')::uuid, extract(year from current_date)::smallint, extract(month from current_date)::smallint, 'cash')), 200.0000::numeric, 'summary has actual income');
select is((select expense_variance from public.get_monthly_summary(current_setting('test.tenant')::uuid, extract(year from current_date)::smallint, extract(month from current_date)::smallint, 'cash')), -80.0000::numeric, 'expense variance is actual minus planned');
select is((select budget_usage_percentage from public.get_monthly_summary(current_setting('test.tenant')::uuid, extract(year from current_date)::smallint, extract(month from current_date)::smallint, 'cash')), 33.33::numeric, 'budget usage is finite and precise');
select lives_ok($$select public.create_transfer(current_setting('test.account')::uuid, current_setting('test.target')::uuid, 50, 'BRL', now(), 'Not income', 'planning-transfer-01')$$, 'creates transfer for exclusion check');
select is((select actual_income from public.get_monthly_summary(current_setting('test.tenant')::uuid, extract(year from current_date)::smallint, extract(month from current_date)::smallint, 'cash')), 200.0000::numeric, 'transfer does not enter planning income');
select is((select count(*) from public.get_monthly_comparison(current_setting('test.tenant')::uuid, extract(year from current_date)::smallint, extract(month from current_date)::smallint, 'competence', current_setting('test.expense_category')::uuid, current_setting('test.account')::uuid, current_setting('test.person')::uuid)), 1::bigint, 'combined category account person filters work');
select is((select public.copy_monthly_plan(current_setting('test.tenant')::uuid, extract(year from current_date)::smallint, extract(month from current_date)::smallint, extract(year from current_date + interval '1 month')::smallint, extract(month from current_date + interval '1 month')::smallint)), 2, 'copies the previous month without duplicating transactions');
select throws_ok($$select public.get_monthly_comparison(current_setting('test.tenant')::uuid, extract(year from current_date)::smallint, extract(month from current_date)::smallint, 'invalid')$$, 'P0001', null, 'invalid regime is rejected');
select is((select count(*) from public.audit_logs where resource_type = 'monthly_plan_item' and tenant_id = current_setting('test.tenant')::uuid), 5::bigint, 'planning revisions are audited');

select * from finish();
rollback;
