begin;
select plan(22);

insert into auth.users (id, aud, role, email, email_confirmed_at, created_at, updated_at) values
  ('96000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'payment-owner@example.com', now(), now(), now()),
  ('96000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'payment-viewer@example.com', now(), now(), now());
set local role authenticated;
select set_config('request.jwt.claim.sub', '96000000-0000-4000-8000-000000000001', true);
select public.create_tenant('Payments A', 'payments-a');
select set_config('test.tenant_a', (select id::text from public.tenants where slug = 'payments-a'), true);
select public.create_tenant('Payments B', 'payments-b');
select set_config('test.tenant_b', (select id::text from public.tenants where slug = 'payments-b'), true);
set local role postgres;
insert into public.tenant_members (tenant_id, user_id, role) values (current_setting('test.tenant_a')::uuid, '96000000-0000-4000-8000-000000000002', 'viewer');
insert into public.accounts (tenant_id, name, type, currency, opening_balance, opening_date) values
  (current_setting('test.tenant_a')::uuid, 'Conta pagadora', 'checking', 'BRL', 1000, current_date),
  (current_setting('test.tenant_a')::uuid, 'Conta dólar', 'checking', 'USD', 1000, current_date),
  (current_setting('test.tenant_b')::uuid, 'Conta B', 'checking', 'BRL', 1000, current_date);
insert into public.categories (tenant_id, name, type) values (current_setting('test.tenant_a')::uuid, 'Cartão', 'expense');
select set_config('test.account', (select id::text from public.accounts where tenant_id = current_setting('test.tenant_a')::uuid and currency = 'BRL'), true);
select set_config('test.usd_account', (select id::text from public.accounts where tenant_id = current_setting('test.tenant_a')::uuid and currency = 'USD'), true);
select set_config('test.category', (select id::text from public.categories where tenant_id = current_setting('test.tenant_a')::uuid), true);
set local role authenticated;
select public.create_credit_card(current_setting('test.tenant_a')::uuid, 'Cartão pagamento', 'Banco', 10000, 'BRL', 15, 10, current_setting('test.account')::uuid);
select set_config('test.card', (select id::text from public.credit_cards where tenant_id = current_setting('test.tenant_a')::uuid), true);
select public.create_card_purchase(current_setting('test.tenant_a')::uuid, current_setting('test.card')::uuid, 'Compra cartão', '2026-01-10', 100, 'BRL', 1, current_setting('test.category')::uuid, null::uuid, null::uuid, 'payment-purchase-001');
select set_config('test.cycle', (select id::text from public.invoice_cycles where card_id = current_setting('test.card')::uuid), true);
select public.generate_card_invoice(current_setting('test.tenant_a')::uuid, current_setting('test.card')::uuid, current_setting('test.cycle')::uuid);
select set_config('test.invoice', (select id::text from public.card_invoices where invoice_cycle_id = current_setting('test.cycle')::uuid), true);
select public.close_card_invoice(current_setting('test.tenant_a')::uuid, current_setting('test.invoice')::uuid);

select ok((select relrowsecurity from pg_class where oid = 'public.card_invoice_payments'::regclass), 'invoice payments have RLS');
select ok(not has_table_privilege('authenticated', 'public.card_invoice_payments', 'INSERT'), 'invoice payments cannot be inserted directly');
select lives_ok($$select public.pay_card_invoice(current_setting('test.tenant_a')::uuid, current_setting('test.invoice')::uuid, current_setting('test.account')::uuid, 40, '2026-01-20T12:00:00Z', 'invoice-payment-001')$$, 'creates partial payment');
select set_config('test.payment', (select id::text from public.card_invoice_payments where idempotency_key = 'invoice-payment-001'), true);
select is((select amount from public.card_invoice_payments where id = current_setting('test.payment')::uuid), 40::numeric, 'payment amount is recorded exactly');
select is((select amount from public.account_movements where card_invoice_payment_id = current_setting('test.payment')::uuid), -40::numeric, 'payment reduces account balance');
select is((select status from public.card_invoices where id = current_setting('test.invoice')::uuid), 'closed', 'partial payment keeps invoice closed and pending');
select is((select count(*) from public.transactions where description like 'Compra cartão (%'), 1::bigint, 'payment does not create a second expense');
select is((select count(*) from public.transaction_settlements where transaction_id in (select transaction_id from public.card_installments where invoice_id = current_setting('test.invoice')::uuid)), 0::bigint, 'payment does not duplicate installment settlements');
select lives_ok($$select public.pay_card_invoice(current_setting('test.tenant_a')::uuid, current_setting('test.invoice')::uuid, current_setting('test.account')::uuid, 40, '2026-01-20T12:00:00Z', 'invoice-payment-001')$$, 'replays payment idempotently');
select is((select count(*) from public.card_invoice_payments where invoice_id = current_setting('test.invoice')::uuid), 1::bigint, 'idempotency does not duplicate payment');
select lives_ok($$select public.pay_card_invoice(current_setting('test.tenant_a')::uuid, current_setting('test.invoice')::uuid, current_setting('test.account')::uuid, 60, '2026-01-21T12:00:00Z', 'invoice-payment-002')$$, 'creates final payment');
select is((select status from public.card_invoices where id = current_setting('test.invoice')::uuid), 'paid', 'integral payment marks invoice paid');
select throws_ok($$select public.pay_card_invoice(current_setting('test.tenant_a')::uuid, current_setting('test.invoice')::uuid, current_setting('test.account')::uuid, 1, '2026-01-22T12:00:00Z', 'invoice-payment-003')$$, 'P0001', null, 'overpayment is rejected');
select throws_ok($$select public.pay_card_invoice(current_setting('test.tenant_a')::uuid, current_setting('test.invoice')::uuid, current_setting('test.usd_account')::uuid, 1, '2026-01-22T12:00:00Z', 'invoice-payment-004')$$, 'P0001', null, 'incompatible currency is rejected');
select lives_ok($$select public.reverse_card_invoice_payment(current_setting('test.payment')::uuid, 'invoice-reversal-001')$$, 'reverses first payment');
select is((select amount from public.account_movements where reversal_of_id = (select movement_id from public.card_invoice_payments where id = current_setting('test.payment')::uuid)), 40::numeric, 'reversal restores account balance');
select is((select status from public.card_invoices where id = current_setting('test.invoice')::uuid), 'closed', 'reversal reopens pending amount without reopening invoice');
select lives_ok($$select public.reverse_card_invoice_payment(current_setting('test.payment')::uuid, 'invoice-reversal-001')$$, 'replays reversal idempotently');
select throws_ok($$select public.reverse_card_invoice_payment(current_setting('test.payment')::uuid, 'invoice-reversal-002')$$, 'P0001', null, 'duplicate reversal is rejected');
select throws_ok($$select public.pay_card_invoice(current_setting('test.tenant_b')::uuid, current_setting('test.invoice')::uuid, current_setting('test.account')::uuid, 1, '2026-01-22T12:00:00Z', 'invoice-payment-005')$$, 'P0001', null, 'cross-tenant invoice is rejected');
select throws_ok($$select public.pay_card_invoice(current_setting('test.tenant_a')::uuid, current_setting('test.invoice')::uuid, current_setting('test.account')::uuid, -1, '2026-01-22T12:00:00Z', 'invoice-payment-006')$$, 'P0001', null, 'negative payment is rejected');
select set_config('request.jwt.claim.sub', '96000000-0000-4000-8000-000000000002', true);
select throws_ok($$select public.reverse_card_invoice_payment(current_setting('test.payment')::uuid, 'invoice-reversal-003')$$, 'P0001', null, 'viewer cannot reverse payment');
select * from finish();
rollback;
