begin;
select plan(19);

insert into auth.users (id, aud, role, email, email_confirmed_at, created_at, updated_at) values
  ('93000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'card-owner@example.com', now(), now(), now()),
  ('93000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'card-viewer@example.com', now(), now(), now());
set local role authenticated;
select set_config('request.jwt.claim.sub', '93000000-0000-4000-8000-000000000001', true);
select public.create_tenant('Cards A', 'cards-a');
select set_config('test.tenant_a', (select id::text from public.tenants where slug = 'cards-a'), true);
select public.create_tenant('Cards B', 'cards-b');
select set_config('test.tenant_b', (select id::text from public.tenants where slug = 'cards-b'), true);
set local role postgres;
insert into public.tenant_members (tenant_id, user_id, role) values (current_setting('test.tenant_a')::uuid, '93000000-0000-4000-8000-000000000002', 'viewer');
insert into public.accounts (tenant_id, name, type, currency, opening_date) values (current_setting('test.tenant_a')::uuid, 'Conta BRL', 'checking', 'BRL', current_date), (current_setting('test.tenant_b')::uuid, 'Conta B', 'checking', 'BRL', current_date);
select set_config('test.account_a', (select id::text from public.accounts where tenant_id = current_setting('test.tenant_a')::uuid), true);
select set_config('test.account_b', (select id::text from public.accounts where tenant_id = current_setting('test.tenant_b')::uuid), true);
set local role authenticated;

select ok((select relrowsecurity from pg_class where oid = 'public.credit_cards'::regclass), 'credit cards have RLS');
select ok(not has_table_privilege('authenticated', 'public.credit_cards', 'INSERT'), 'credit cards cannot be inserted directly');
select lives_ok($$select public.create_credit_card(current_setting('test.tenant_a')::uuid, 'Cartão principal', 'Banco A', 5000, 'BRL', 31, 10, current_setting('test.account_a')::uuid)$$, 'creates credit card');
select set_config('test.card', (select id::text from public.credit_cards where name = 'Cartão principal'), true);
select is((select credit_limit from public.credit_cards where id = current_setting('test.card')::uuid), 5000.0000::numeric, 'stores exact credit limit');
select throws_ok($$select public.create_credit_card(current_setting('test.tenant_a')::uuid, 'Cartão principal', null::text, 100, 'BRL', 1, 1, null::uuid)$$, '23505', null, 'rejects duplicate normalized name');
select throws_ok($$select public.create_credit_card(current_setting('test.tenant_a')::uuid, 'Limite negativo', null::text, -1, 'BRL', 1, 1, null::uuid)$$, '23514', null, 'rejects negative limit');
select throws_ok($$select public.create_credit_card(current_setting('test.tenant_a')::uuid, 'Dia inválido', null::text, 1, 'BRL', 0, 1, null::uuid)$$, '23514', null, 'rejects invalid closing day');
select throws_ok($$select public.create_credit_card(current_setting('test.tenant_a')::uuid, 'Dia vencimento inválido', null::text, 1, 'BRL', 1, 32, null::uuid)$$, '23514', null, 'rejects invalid due day');
select throws_ok($$select public.create_credit_card(current_setting('test.tenant_a')::uuid, 'Conta cruzada', null::text, 1, 'BRL', 1, 1, current_setting('test.account_b')::uuid)$$, 'P0001', null, 'rejects payment account from another tenant');
select throws_ok($$select public.create_credit_card(current_setting('test.tenant_a')::uuid, 'Moeda incompatível', null::text, 1, 'USD', 1, 1, current_setting('test.account_a')::uuid)$$, 'P0001', null, 'rejects payment account with another currency');
select lives_ok($$select public.update_credit_card(current_setting('test.tenant_a')::uuid, current_setting('test.card')::uuid, 'Cartão principal', 'Banco novo', 7500, 'BRL', 28, 15, current_setting('test.account_a')::uuid)$$, 'updates card fields');
select is((select closing_day from public.credit_cards where id = current_setting('test.card')::uuid), 28, 'updates closing day');
select is((select credit_limit from public.credit_cards where id = current_setting('test.card')::uuid), 7500.0000::numeric, 'updates credit limit');
select lives_ok($$select public.set_credit_card_state(current_setting('test.tenant_a')::uuid, current_setting('test.card')::uuid, false)$$, 'archives card');
select is((select archived_at is not null from public.credit_cards where id = current_setting('test.card')::uuid), true, 'archive timestamp is preserved');
select lives_ok($$select public.set_credit_card_state(current_setting('test.tenant_a')::uuid, current_setting('test.card')::uuid, true)$$, 'reactivates card');
select is((select is_active and archived_at is null from public.credit_cards where id = current_setting('test.card')::uuid), true, 'reactivation clears archive state');
select is((select count(*) from public.credit_cards where tenant_id = current_setting('test.tenant_b')::uuid), 0::bigint, 'tenant data is isolated');
select set_config('request.jwt.claim.sub', '93000000-0000-4000-8000-000000000002', true);
select throws_ok($$select public.set_credit_card_state(current_setting('test.tenant_a')::uuid, current_setting('test.card')::uuid, false)$$, 'P0001', null, 'viewer cannot archive card');
select * from finish();
rollback;
