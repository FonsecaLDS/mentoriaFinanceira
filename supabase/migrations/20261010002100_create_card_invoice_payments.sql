-- FIN-030: pagamentos e reversões de faturas sem duplicar despesas de consumo.

create table public.card_invoice_payments (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  invoice_id uuid not null,
  account_id uuid not null,
  movement_id uuid not null,
  amount numeric(19,4) not null check (amount > 0 and amount = round(amount, 4)),
  currency varchar(3) not null check (currency ~ '^[A-Z]{3}$'),
  paid_at timestamptz not null,
  idempotency_key text not null check (char_length(idempotency_key) between 16 and 200),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  reversed_at timestamptz null,
  reversed_by uuid null references auth.users(id),
  reversal_idempotency_key text null check (reversal_idempotency_key is null or char_length(reversal_idempotency_key) between 16 and 200),
  unique (tenant_id, id),
  unique (tenant_id, idempotency_key),
  unique (tenant_id, movement_id),
  foreign key (tenant_id, invoice_id) references public.card_invoices(tenant_id, id) on delete restrict,
  foreign key (tenant_id, account_id) references public.accounts(tenant_id, id) on delete restrict
);

alter table public.account_movements add column card_invoice_payment_id uuid null;
alter table public.account_movements drop constraint if exists account_movements_origin_check;
alter table public.account_movements add constraint account_movements_origin_check check (
  ((settlement_id is not null)::int + (transfer_id is not null)::int + (card_invoice_payment_id is not null)::int + (reversal_of_id is not null)::int) = 1
);
alter table public.account_movements add constraint account_movements_invoice_payment_fk
  foreign key (tenant_id, card_invoice_payment_id) references public.card_invoice_payments(tenant_id, id) on delete restrict;
alter table public.card_invoice_payments add constraint card_invoice_payments_movement_fk
  foreign key (tenant_id, movement_id) references public.account_movements(tenant_id, id) on delete restrict deferrable initially deferred;

create unique index card_invoice_payments_reversal_key_idx
  on public.card_invoice_payments (tenant_id, reversal_idempotency_key)
  where reversal_idempotency_key is not null;
create index card_invoice_payments_invoice_idx on public.card_invoice_payments (tenant_id, invoice_id, paid_at desc);
create index card_invoice_payments_account_idx on public.card_invoice_payments (tenant_id, account_id, paid_at desc);
create index account_movements_invoice_payment_idx on public.account_movements (tenant_id, card_invoice_payment_id);

create or replace function public.validate_card_invoice_state()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if new.tenant_id <> old.tenant_id or new.card_id <> old.card_id or new.invoice_cycle_id <> old.invoice_cycle_id then
    raise exception 'invoice identity cannot change';
  end if;
  if old.status in ('closed', 'paid') and new.status = 'open' then
    raise exception 'closed invoice cannot be reopened';
  end if;
  if old.status in ('closed', 'paid') and new.total_amount <> old.total_amount then
    raise exception 'closed invoice total cannot change';
  end if;
  if new.status = 'paid' and new.paid_at is null then
    raise exception 'paid invoice requires payment';
  end if;
  return new;
end;
$$;

create or replace function public.audit_card_invoice_payment_changes()
returns trigger language plpgsql security definer set search_path = public, auth, pg_temp as $$
begin
  perform public.write_audit_event(new.tenant_id, auth.uid(), case when tg_op = 'INSERT' then 'card_invoice_payment.created' else 'card_invoice_payment.reversed' end, 'card_invoice_payment', new.id, jsonb_build_object('invoice_id', new.invoice_id, 'account_id', new.account_id, 'amount', new.amount, 'currency', new.currency, 'paid_at', new.paid_at, 'reversed_at', new.reversed_at, 'reversal_idempotency_key', new.reversal_idempotency_key));
  return new;
end;
$$;
create trigger card_invoice_payments_audit_changes after insert or update on public.card_invoice_payments for each row execute function public.audit_card_invoice_payment_changes();

create or replace function public.pay_card_invoice(
  p_tenant_id uuid, p_invoice_id uuid, p_account_id uuid, p_amount numeric, p_paid_at timestamptz, p_idempotency_key text
)
returns public.card_invoice_payments language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare
  invoice public.card_invoices;
  account public.accounts;
  existing public.card_invoice_payments;
  payment public.card_invoice_payments;
  paid numeric(19,4);
  movement_id uuid := extensions.gen_random_uuid();
begin
  if auth.uid() is null then raise exception 'authenticated user required'; end if;
  if not public.has_tenant_role(p_tenant_id, array['owner', 'admin', 'editor']) then raise exception 'card invoice payment permission denied'; end if;
  if p_idempotency_key is null or char_length(p_idempotency_key) not between 16 and 200 then raise exception 'invalid payment idempotency key'; end if;
  select * into existing from public.card_invoice_payments where tenant_id = p_tenant_id and idempotency_key = p_idempotency_key for update;
  if existing.id is not null then
    if existing.invoice_id <> p_invoice_id or existing.account_id <> p_account_id or existing.amount <> p_amount then raise exception 'payment idempotency key payload mismatch'; end if;
    if existing.reversed_at is not null then raise exception 'payment has already been reversed'; end if;
    return existing;
  end if;
  select * into invoice from public.card_invoices where tenant_id = p_tenant_id and id = p_invoice_id for update;
  if not found then raise exception 'card invoice not found'; end if;
  if invoice.status <> 'closed' then raise exception 'only closed invoices can be paid'; end if;
  if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount, 4) then raise exception 'invalid invoice payment amount'; end if;
  if p_paid_at is null or p_paid_at > now() then raise exception 'payment date cannot be in the future'; end if;
  select * into account from public.accounts where tenant_id = p_tenant_id and id = p_account_id for update;
  if not found or not account.is_active then raise exception 'active payment account is required'; end if;
  if account.currency <> invoice.currency then raise exception 'payment currency must match invoice currency'; end if;
  select coalesce(sum(amount), 0) into paid from public.card_invoice_payments where tenant_id = p_tenant_id and invoice_id = p_invoice_id and reversed_at is null;
  if p_amount > invoice.total_amount - paid then raise exception 'invoice payment exceeds pending amount'; end if;
  insert into public.card_invoice_payments (tenant_id, invoice_id, account_id, movement_id, amount, currency, paid_at, idempotency_key, created_by)
  values (p_tenant_id, p_invoice_id, p_account_id, movement_id, p_amount, invoice.currency, p_paid_at, p_idempotency_key, auth.uid())
  returning * into payment;
  insert into public.account_movements (id, tenant_id, account_id, card_invoice_payment_id, amount, effective_at)
  values (movement_id, p_tenant_id, p_account_id, payment.id, -p_amount, p_paid_at);
  paid := paid + p_amount;
  update public.card_invoices set status = case when paid = invoice.total_amount then 'paid' else 'closed' end, paid_at = case when paid = invoice.total_amount then now() else null end where tenant_id = p_tenant_id and id = p_invoice_id;
  return payment;
end;
$$;

create or replace function public.reverse_card_invoice_payment(p_payment_id uuid, p_idempotency_key text)
returns public.card_invoice_payments language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare
  payment public.card_invoice_payments;
  existing public.card_invoice_payments;
  invoice public.card_invoices;
  movement public.account_movements;
  paid numeric(19,4);
begin
  if auth.uid() is null then raise exception 'authenticated user required'; end if;
  if p_idempotency_key is null or char_length(p_idempotency_key) not between 16 and 200 then raise exception 'invalid payment reversal idempotency key'; end if;
  select * into payment from public.card_invoice_payments where id = p_payment_id for update;
  if not found then raise exception 'card invoice payment not found'; end if;
  if not public.has_tenant_role(payment.tenant_id, array['owner', 'admin', 'editor']) then raise exception 'card invoice payment reversal permission denied'; end if;
  select * into existing from public.card_invoice_payments where tenant_id = payment.tenant_id and reversal_idempotency_key = p_idempotency_key for update;
  if existing.id is not null then
    if existing.id <> payment.id then raise exception 'payment reversal idempotency key payload mismatch'; end if;
    return existing;
  end if;
  if payment.reversed_at is not null then raise exception 'card invoice payment has already been reversed'; end if;
  select * into invoice from public.card_invoices where tenant_id = payment.tenant_id and id = payment.invoice_id for update;
  select * into movement from public.account_movements where tenant_id = payment.tenant_id and card_invoice_payment_id = payment.id for update;
  if not found then raise exception 'card invoice payment movement not found'; end if;
  insert into public.account_movements (tenant_id, account_id, reversal_of_id, amount, effective_at)
  values (movement.tenant_id, movement.account_id, movement.id, -movement.amount, now());
  update public.card_invoice_payments set reversed_at = now(), reversed_by = auth.uid(), reversal_idempotency_key = p_idempotency_key where tenant_id = payment.tenant_id and id = payment.id returning * into payment;
  select coalesce(sum(amount), 0) into paid from public.card_invoice_payments where tenant_id = payment.tenant_id and invoice_id = payment.invoice_id and reversed_at is null;
  update public.card_invoices set status = case when paid = invoice.total_amount then 'paid' else 'closed' end, paid_at = case when paid = invoice.total_amount then paid_at else null end where tenant_id = payment.tenant_id and id = payment.invoice_id;
  return payment;
end;
$$;

alter table public.card_invoice_payments enable row level security;
create policy card_invoice_payments_select_members on public.card_invoice_payments for select to authenticated using (public.is_active_tenant_member(tenant_id));
revoke all on table public.card_invoice_payments from public, anon, authenticated;
grant select on public.card_invoice_payments to authenticated;
revoke all on function public.validate_card_invoice_state(), public.audit_card_invoice_payment_changes(), public.pay_card_invoice(uuid,uuid,uuid,numeric,timestamptz,text), public.reverse_card_invoice_payment(uuid,text) from public, anon, authenticated;
grant execute on function public.pay_card_invoice(uuid,uuid,uuid,numeric,timestamptz,text), public.reverse_card_invoice_payment(uuid,text) to authenticated;
