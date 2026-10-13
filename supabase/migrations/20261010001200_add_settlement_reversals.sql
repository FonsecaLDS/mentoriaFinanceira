-- FIN-021: reversões rastreáveis de liquidações.

alter table public.transaction_settlements
  add column reversed_at timestamptz null,
  add column reversed_by uuid null references auth.users(id),
  add column reversal_idempotency_key text null
    check (reversal_idempotency_key is null or char_length(reversal_idempotency_key) between 16 and 200);

create unique index transaction_settlements_reversal_key_idx
  on public.transaction_settlements (tenant_id, reversal_idempotency_key)
  where reversal_idempotency_key is not null;

alter table public.account_movements
  add column reversal_of_id uuid null;

alter table public.account_movements
  add constraint account_movements_origin_check
  check ((settlement_id is not null) <> (reversal_of_id is not null));

alter table public.account_movements
  add constraint account_movements_reversal_fk
  foreign key (tenant_id, reversal_of_id)
  references public.account_movements (tenant_id, id)
  on delete restrict;

create unique index account_movements_reversal_idx
  on public.account_movements (tenant_id, reversal_of_id)
  where reversal_of_id is not null;

create or replace function public.validate_transaction_state()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare settled numeric(19,4) := 0;
begin
  select coalesce(sum(amount), 0) into settled
  from public.transaction_settlements
  where tenant_id = new.tenant_id
    and transaction_id = new.id
    and reversed_at is null;
  if new.status = 'planned' and settled > 0 then raise exception 'planned transaction cannot have settlements'; end if;
  if new.status = 'pending' and settled > 0 then raise exception 'pending transaction cannot have settlements'; end if;
  if new.status = 'partially_paid' and (settled <= 0 or settled >= new.amount) then raise exception 'partially paid status is inconsistent'; end if;
  if new.status = 'paid' and settled <> new.amount then raise exception 'paid status is inconsistent'; end if;
  if new.status = 'cancelled' and settled > 0 then raise exception 'settled transaction cannot be cancelled'; end if;
  return new;
end;
$$;

create or replace function public.audit_settlement_changes()
returns trigger
language plpgsql security definer
set search_path = public, auth, pg_temp
as $$
begin
  perform public.write_audit_event(
    new.tenant_id,
    auth.uid(),
    case when tg_op = 'INSERT' then 'transaction.settled' else 'transaction.settlement_reversed' end,
    'transaction_settlement',
    new.id,
    jsonb_build_object(
      'transaction_id', new.transaction_id,
      'account_id', new.account_id,
      'amount', new.amount,
      'reversed_at', new.reversed_at,
      'reversal_idempotency_key', new.reversal_idempotency_key
    )
  );
  return new;
end;
$$;

drop trigger if exists settlements_audit_changes on public.transaction_settlements;
create trigger settlements_audit_changes
after insert or update on public.transaction_settlements
for each row execute function public.audit_settlement_changes();

create or replace function public.settle_transaction(
  p_transaction_id uuid,
  p_account_id uuid,
  p_amount numeric,
  p_settled_at timestamptz,
  p_idempotency_key text
)
returns public.transaction_settlements
language plpgsql security definer
set search_path = public, auth, pg_temp
as $$
declare
  target public.transactions;
  account public.accounts;
  existing public.transaction_settlements;
  new_settlement public.transaction_settlements;
  settled numeric(19,4);
begin
  if auth.uid() is null then raise exception 'authenticated user required'; end if;
  select * into target from public.transactions where id = p_transaction_id for update;
  if not found then raise exception 'transaction not found'; end if;
  if not public.has_tenant_role(target.tenant_id, array['owner', 'admin', 'editor']) then raise exception 'transaction settlement permission denied'; end if;
  if p_idempotency_key is null or char_length(p_idempotency_key) not between 16 and 200 then raise exception 'invalid idempotency key'; end if;
  select * into existing from public.transaction_settlements where tenant_id = target.tenant_id and idempotency_key = p_idempotency_key for update;
  if existing.id is not null then
    if existing.reversed_at is not null then raise exception 'settlement has already been reversed'; end if;
    if existing.transaction_id <> p_transaction_id or existing.account_id <> p_account_id or existing.amount <> p_amount then raise exception 'idempotency key payload mismatch'; end if;
    return existing;
  end if;
  if target.status = 'cancelled' then raise exception 'cancelled transaction cannot be settled'; end if;
  if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount, 4) then raise exception 'invalid settlement amount'; end if;
  if p_settled_at is null or p_settled_at > now() then raise exception 'settlement date cannot be in the future'; end if;
  select * into account from public.accounts where tenant_id = target.tenant_id and id = p_account_id for update;
  if not found or not account.is_active then raise exception 'active account is required'; end if;
  if account.currency <> target.currency then raise exception 'settlement currency must match transaction currency'; end if;
  select coalesce(sum(amount), 0) into settled
  from public.transaction_settlements
  where tenant_id = target.tenant_id
    and transaction_id = target.id
    and reversed_at is null;
  if p_amount > target.amount - settled then raise exception 'settlement exceeds pending amount'; end if;
  insert into public.transaction_settlements (tenant_id, transaction_id, account_id, amount, settled_at, idempotency_key, created_by)
  values (target.tenant_id, target.id, p_account_id, p_amount, p_settled_at, p_idempotency_key, auth.uid()) returning * into new_settlement;
  insert into public.account_movements (tenant_id, account_id, settlement_id, amount, effective_at)
  values (target.tenant_id, p_account_id, new_settlement.id, case when target.type = 'income' then p_amount else -p_amount end, p_settled_at);
  update public.transactions set status = case when settled + p_amount = target.amount then 'paid' else 'partially_paid' end where id = target.id;
  return new_settlement;
end;
$$;

create or replace function public.reverse_transaction_settlement(
  p_settlement_id uuid,
  p_idempotency_key text
)
returns public.transaction_settlements
language plpgsql security definer
set search_path = public, auth, pg_temp
as $$
declare
  target public.transaction_settlements;
  transaction_row public.transactions;
  movement public.account_movements;
  existing public.transaction_settlements;
  settled numeric(19,4);
begin
  if auth.uid() is null then raise exception 'authenticated user required'; end if;
  if p_idempotency_key is null or char_length(p_idempotency_key) not between 16 and 200 then raise exception 'invalid reversal idempotency key'; end if;
  select * into target from public.transaction_settlements where id = p_settlement_id for update;
  if not found then raise exception 'settlement not found'; end if;
  if not public.has_tenant_role(target.tenant_id, array['owner', 'admin', 'editor']) then raise exception 'settlement reversal permission denied'; end if;
  select * into existing
  from public.transaction_settlements
  where tenant_id = target.tenant_id and reversal_idempotency_key = p_idempotency_key
  for update;
  if existing.id is not null then
    if existing.id <> target.id then raise exception 'reversal idempotency key payload mismatch'; end if;
    return existing;
  end if;
  if target.reversed_at is not null then raise exception 'settlement has already been reversed'; end if;
  select * into transaction_row from public.transactions where tenant_id = target.tenant_id and id = target.transaction_id for update;
  if not found then raise exception 'transaction not found'; end if;
  select * into movement from public.account_movements where tenant_id = target.tenant_id and settlement_id = target.id for update;
  if not found then raise exception 'settlement movement not found'; end if;
  insert into public.account_movements (tenant_id, account_id, reversal_of_id, amount, effective_at)
  values (movement.tenant_id, movement.account_id, movement.id, -movement.amount, now());
  update public.transaction_settlements
  set reversed_at = now(), reversed_by = auth.uid(), reversal_idempotency_key = p_idempotency_key
  where id = target.id;
  select coalesce(sum(amount), 0) into settled
  from public.transaction_settlements
  where tenant_id = target.tenant_id
    and transaction_id = target.transaction_id
    and reversed_at is null;
  update public.transactions
  set status = case
    when settled = 0 then 'pending'
    when settled = amount then 'paid'
    else 'partially_paid'
  end
  where tenant_id = target.tenant_id and id = target.transaction_id;
  select * into target from public.transaction_settlements where id = p_settlement_id;
  return target;
end;
$$;

revoke all on function public.settle_transaction(uuid, uuid, numeric, timestamptz, text) from public, anon;
grant execute on function public.settle_transaction(uuid, uuid, numeric, timestamptz, text) to authenticated;
revoke all on function public.reverse_transaction_settlement(uuid, text) from public, anon;
grant execute on function public.reverse_transaction_settlement(uuid, text) to authenticated;
revoke all on function public.validate_transaction_state(), public.audit_settlement_changes() from public, anon, authenticated;
