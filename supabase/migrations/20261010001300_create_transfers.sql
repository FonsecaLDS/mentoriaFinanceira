-- FIN-022: transferências internas atômicas entre contas do mesmo tenant.

create table public.transfers (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  source_account_id uuid not null,
  target_account_id uuid not null,
  amount numeric(19,4) not null check (amount > 0 and amount = round(amount, 4)),
  currency varchar(3) not null check (currency ~ '^[A-Z]{3}$'),
  effective_at timestamptz not null,
  description text null check (description is null or char_length(description) <= 200),
  idempotency_key text not null check (char_length(idempotency_key) between 16 and 200),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  reversed_at timestamptz null,
  reversed_by uuid null references auth.users(id),
  reversal_idempotency_key text null check (reversal_idempotency_key is null or char_length(reversal_idempotency_key) between 16 and 200),
  unique (tenant_id, id),
  constraint transfers_source_target_check check (source_account_id <> target_account_id),
  constraint transfers_source_account_fk foreign key (tenant_id, source_account_id)
    references public.accounts(tenant_id, id) on delete restrict,
  constraint transfers_target_account_fk foreign key (tenant_id, target_account_id)
    references public.accounts(tenant_id, id) on delete restrict
);

create unique index transfers_idempotency_idx on public.transfers (tenant_id, idempotency_key);
create unique index transfers_reversal_idempotency_idx on public.transfers (tenant_id, reversal_idempotency_key)
  where reversal_idempotency_key is not null;
create index transfers_tenant_effective_idx on public.transfers (tenant_id, effective_at desc, id desc);
create index transfers_source_account_idx on public.transfers (tenant_id, source_account_id);
create index transfers_target_account_idx on public.transfers (tenant_id, target_account_id);

alter table public.account_movements add column transfer_id uuid null;
alter table public.account_movements drop constraint if exists account_movements_origin_check;
alter table public.account_movements
  add constraint account_movements_origin_check check (
    ((settlement_id is not null)::int + (transfer_id is not null)::int + (reversal_of_id is not null)::int) = 1
  );
alter table public.account_movements
  add constraint account_movements_transfer_fk foreign key (tenant_id, transfer_id)
  references public.transfers(tenant_id, id) on delete restrict;
create index account_movements_transfer_idx on public.account_movements (tenant_id, transfer_id);

alter table public.transfers enable row level security;
create policy transfers_select_member on public.transfers for select to authenticated
  using (public.is_active_tenant_member(tenant_id));
revoke insert, update, delete on public.transfers from authenticated, anon;
grant select on public.transfers to authenticated;

create or replace function public.audit_transfer_changes()
returns trigger
language plpgsql security definer
set search_path = public, auth, pg_temp
as $$
begin
  perform public.write_audit_event(
    new.tenant_id,
    auth.uid(),
    case when tg_op = 'INSERT' then 'transfer.created' else 'transfer.reversed' end,
    'transfer',
    new.id,
    jsonb_build_object(
      'source_account_id', new.source_account_id,
      'target_account_id', new.target_account_id,
      'amount', new.amount,
      'currency', new.currency,
      'reversed_at', new.reversed_at,
      'reversal_idempotency_key', new.reversal_idempotency_key
    )
  );
  return new;
end;
$$;

create trigger transfers_audit_changes
after insert or update on public.transfers
for each row execute function public.audit_transfer_changes();

create or replace function public.create_transfer(
  p_source_account_id uuid,
  p_target_account_id uuid,
  p_amount numeric,
  p_currency varchar(3),
  p_effective_at timestamptz,
  p_description text,
  p_idempotency_key text
)
returns public.transfers
language plpgsql security definer
set search_path = public, auth, pg_temp
as $$
declare
  source_account public.accounts;
  target_account public.accounts;
  existing public.transfers;
  created public.transfers;
begin
  if auth.uid() is null then raise exception 'authenticated user required'; end if;
  if p_idempotency_key is null or char_length(p_idempotency_key) not between 16 and 200 then raise exception 'invalid idempotency key'; end if;
  if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount, 4) then raise exception 'invalid transfer amount'; end if;
  if p_effective_at is null or p_effective_at > now() then raise exception 'transfer date cannot be in the future'; end if;
  if p_source_account_id = p_target_account_id then raise exception 'source and target accounts must differ'; end if;
  if p_currency is null or p_currency !~ '^[A-Z]{3}$' then raise exception 'invalid transfer currency'; end if;

  select * into source_account from public.accounts where id = p_source_account_id;
  if not found then raise exception 'source account not found'; end if;
  if not public.has_tenant_role(source_account.tenant_id, array['owner', 'admin', 'editor']) then raise exception 'transfer permission denied'; end if;

  select * into existing from public.transfers
  where tenant_id = source_account.tenant_id and idempotency_key = p_idempotency_key
  for update;
  if existing.id is not null then
    if existing.source_account_id <> p_source_account_id or existing.target_account_id <> p_target_account_id
      or existing.amount <> p_amount or existing.currency <> p_currency or existing.effective_at <> p_effective_at
      or coalesce(existing.description, '') <> coalesce(nullif(trim(p_description), ''), '') then
      raise exception 'idempotency key payload mismatch';
    end if;
    return existing;
  end if;

  -- Locks are acquired in UUID order so opposite transfers do not deadlock.
  perform 1 from public.accounts
  where tenant_id = source_account.tenant_id and id in (p_source_account_id, p_target_account_id)
  order by id for update;
  select * into source_account from public.accounts where tenant_id = source_account.tenant_id and id = p_source_account_id;
  select * into target_account from public.accounts where tenant_id = source_account.tenant_id and id = p_target_account_id;
  if not found then raise exception 'target account not found'; end if;
  if not source_account.is_active or not target_account.is_active then raise exception 'active accounts are required'; end if;
  if source_account.currency <> target_account.currency or source_account.currency <> p_currency then raise exception 'transfer currency must match both accounts'; end if;

  insert into public.transfers (tenant_id, source_account_id, target_account_id, amount, currency, effective_at, description, idempotency_key, created_by)
  values (source_account.tenant_id, p_source_account_id, p_target_account_id, p_amount, p_currency, p_effective_at, nullif(trim(p_description), ''), p_idempotency_key, auth.uid())
  returning * into created;
  insert into public.account_movements (tenant_id, account_id, transfer_id, amount, effective_at)
  values
    (created.tenant_id, created.source_account_id, created.id, -created.amount, created.effective_at),
    (created.tenant_id, created.target_account_id, created.id, created.amount, created.effective_at);
  return created;
end;
$$;

create or replace function public.reverse_transfer(p_transfer_id uuid, p_idempotency_key text)
returns public.transfers
language plpgsql security definer
set search_path = public, auth, pg_temp
as $$
declare
  target public.transfers;
  existing public.transfers;
  movement public.account_movements;
begin
  if auth.uid() is null then raise exception 'authenticated user required'; end if;
  if p_idempotency_key is null or char_length(p_idempotency_key) not between 16 and 200 then raise exception 'invalid reversal idempotency key'; end if;
  select * into target from public.transfers where id = p_transfer_id for update;
  if not found then raise exception 'transfer not found'; end if;
  if not public.has_tenant_role(target.tenant_id, array['owner', 'admin', 'editor']) then raise exception 'transfer reversal permission denied'; end if;
  select * into existing from public.transfers where tenant_id = target.tenant_id and reversal_idempotency_key = p_idempotency_key for update;
  if existing.id is not null then
    if existing.id <> target.id then raise exception 'reversal idempotency key payload mismatch'; end if;
    return existing;
  end if;
  if target.reversed_at is not null then raise exception 'transfer has already been reversed'; end if;

  for movement in select * from public.account_movements where tenant_id = target.tenant_id and transfer_id = target.id for update loop
    insert into public.account_movements (tenant_id, account_id, reversal_of_id, amount, effective_at)
    values (movement.tenant_id, movement.account_id, movement.id, -movement.amount, now());
  end loop;
  update public.transfers
  set reversed_at = now(), reversed_by = auth.uid(), reversal_idempotency_key = p_idempotency_key
  where id = target.id;
  select * into target from public.transfers where id = p_transfer_id;
  return target;
end;
$$;

revoke all on function public.create_transfer(uuid, uuid, numeric, varchar, timestamptz, text, text) from public, anon;
grant execute on function public.create_transfer(uuid, uuid, numeric, varchar, timestamptz, text, text) to authenticated;
revoke all on function public.reverse_transfer(uuid, text) from public, anon;
grant execute on function public.reverse_transfer(uuid, text) to authenticated;
revoke all on function public.audit_transfer_changes() from public, anon, authenticated;
