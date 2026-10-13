begin;
select plan(21);

insert into auth.users (id, aud, role, email, email_confirmed_at, created_at, updated_at) values
  ('92000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'recurrence-owner@example.com', now(), now(), now()),
  ('92000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'recurrence-viewer@example.com', now(), now(), now());
set local role authenticated;
select set_config('request.jwt.claim.sub', '92000000-0000-4000-8000-000000000001', true);
select public.create_tenant('Recurrences A', 'recurrences-a');
select set_config('test.tenant', (select id::text from public.tenants where slug = 'recurrences-a'), true);
set local role postgres;
insert into public.tenant_members (tenant_id, user_id, role) values (current_setting('test.tenant')::uuid, '92000000-0000-4000-8000-000000000002', 'viewer');
insert into public.accounts (tenant_id, name, type, currency, opening_date) values (current_setting('test.tenant')::uuid, 'Conta recorrente', 'checking', 'BRL', current_date);
insert into public.categories (tenant_id, name, type) values (current_setting('test.tenant')::uuid, 'Despesa recorrente', 'expense'), (current_setting('test.tenant')::uuid, 'Receita recorrente', 'income');
select set_config('test.account', (select id::text from public.accounts where tenant_id = current_setting('test.tenant')::uuid), true);
select set_config('test.expense', (select id::text from public.categories where tenant_id = current_setting('test.tenant')::uuid and type = 'expense'), true);
select set_config('test.income', (select id::text from public.categories where tenant_id = current_setting('test.tenant')::uuid and type = 'income'), true);
set local role authenticated;

select ok((select relrowsecurity from pg_class where oid = 'public.recurrence_rules'::regclass), 'recurrence rules have RLS');
select ok(not has_table_privilege('authenticated', 'public.recurrence_rules', 'INSERT'), 'recurrence rules cannot be inserted directly');
select lives_ok($$select public.create_recurrence_rule(current_setting('test.tenant')::uuid, 'expense', 'daily', 1::smallint, current_date, current_date + 2, null::integer, 10, 'BRL', 'Diária', current_setting('test.expense')::uuid, null::uuid, null::uuid, current_setting('test.account')::uuid)$$, 'creates daily recurrence');
select set_config('test.daily', (select id::text from public.recurrence_rules where description = 'Diária'), true);
select is(public.generate_due_occurrences(current_setting('test.tenant')::uuid, current_date + 2, 100), 3, 'daily recurrence generates three occurrences');
select is((select count(*) from public.transactions where recurrence_rule_id = current_setting('test.daily')::uuid), 3::bigint, 'daily occurrences link to rule');
select is((select count(*) from public.transactions where recurrence_rule_id = current_setting('test.daily')::uuid and status = 'planned'), 3::bigint, 'generated occurrences remain planned');
select is(public.generate_due_occurrences(current_setting('test.tenant')::uuid, current_date + 2, 100), 0, 'reprocessing is idempotent');
select is((select count(*) from public.account_movements where tenant_id = current_setting('test.tenant')::uuid), 0::bigint, 'planned occurrences do not move account balances');
select lives_ok($$select public.create_recurrence_rule(current_setting('test.tenant')::uuid, 'income', 'monthly', 1::smallint, '2024-01-31', '2024-03-31', null::integer, 100, 'BRL', 'Mensal dia 31', current_setting('test.income')::uuid, null::uuid, null::uuid, current_setting('test.account')::uuid)$$, 'creates monthly recurrence');
select set_config('test.monthly', (select id::text from public.recurrence_rules where description = 'Mensal dia 31'), true);
select is(public.generate_due_occurrences(current_setting('test.tenant')::uuid, '2024-03-31', 100), 3, 'monthly recurrence generates three occurrences');
select is((select count(*) from public.transactions where recurrence_rule_id = current_setting('test.monthly')::uuid and recurrence_occurrence_date in ('2024-01-31', '2024-02-29', '2024-03-31')), 3::bigint, 'monthly dates clamp leap February deterministically');
select lives_ok($$select public.create_recurrence_rule(current_setting('test.tenant')::uuid, 'expense', 'weekly', 1::smallint, current_date, null::date, 1, 20, 'BRL', 'Semanal', current_setting('test.expense')::uuid, null::uuid, null::uuid, current_setting('test.account')::uuid)$$, 'creates weekly recurrence with maximum');
select set_config('test.weekly', (select id::text from public.recurrence_rules where description = 'Semanal'), true);
select is(public.generate_due_occurrences(current_setting('test.tenant')::uuid, current_date + 30, 100), 1, 'maximum occurrences is respected');
select lives_ok($$select public.set_recurrence_state(current_setting('test.tenant')::uuid, current_setting('test.daily')::uuid, 'cancel')$$, 'cancels recurrence');
select is((select count(*) from public.transactions where recurrence_rule_id = current_setting('test.daily')::uuid), 3::bigint, 'cancellation preserves history');
select lives_ok($$select public.create_recurrence_rule(current_setting('test.tenant')::uuid, 'expense', 'daily', 1::smallint, current_date + 10, null::date, null::integer, 5, 'BRL', 'Pausável', current_setting('test.expense')::uuid, null::uuid, null::uuid, current_setting('test.account')::uuid)$$, 'creates pausable recurrence');
select set_config('test.pausable', (select id::text from public.recurrence_rules where description = 'Pausável'), true);
select lives_ok($$select public.set_recurrence_state(current_setting('test.tenant')::uuid, current_setting('test.pausable')::uuid, 'pause')$$, 'pauses recurrence');
select is(public.generate_due_occurrences(current_setting('test.tenant')::uuid, current_date + 20, 100), 0, 'paused recurrence is not generated');
select lives_ok($$select public.set_recurrence_state(current_setting('test.tenant')::uuid, current_setting('test.pausable')::uuid, 'resume')$$, 'resumes recurrence');
select throws_ok($$select public.create_recurrence_rule(current_setting('test.tenant')::uuid, 'expense', 'daily', 1::smallint, current_date, null::date, null::integer, 5, 'BRL', 'Categoria inválida', current_setting('test.income')::uuid, null::uuid, null::uuid, current_setting('test.account')::uuid)$$, 'P0001', null, 'rejects category from another transaction type');
select set_config('request.jwt.claim.sub', '92000000-0000-4000-8000-000000000002', true);
select throws_ok($$select public.create_recurrence_rule(current_setting('test.tenant')::uuid, 'expense', 'daily', 1::smallint, current_date, null::date, null::integer, 5, 'BRL', 'Viewer', current_setting('test.expense')::uuid, null::uuid, null::uuid, current_setting('test.account')::uuid)$$, 'P0001', null, 'viewer cannot create recurrence');
select * from finish();
rollback;
