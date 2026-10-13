-- FIN-019: obrigações, liquidações e livro de movimentos confirmados.

create table public.transactions (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  description text not null check (char_length(btrim(description)) between 1 and 200),
  amount numeric(19,4) not null check (amount > 0),
  currency varchar(3) not null check (currency ~ '^[A-Z]{3}$'),
  category_id uuid null,
  person_id uuid null,
  cost_center_id uuid null,
  account_id uuid null,
  competence_date date not null,
  due_date date null,
  status text not null default 'planned' check (status in ('planned', 'pending', 'partially_paid', 'paid', 'cancelled')),
  notes text null check (notes is null or char_length(notes) <= 2000),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cancelled_at timestamptz null,
  unique (tenant_id, id),
  foreign key (tenant_id, category_id) references public.categories(tenant_id, id) on delete restrict,
  foreign key (tenant_id, person_id) references public.people(tenant_id, id) on delete restrict,
  foreign key (tenant_id, cost_center_id) references public.cost_centers(tenant_id, id) on delete restrict,
  foreign key (tenant_id, account_id) references public.accounts(tenant_id, id) on delete restrict,
  check (due_date is null or due_date >= competence_date),
  check ((status = 'cancelled' and cancelled_at is not null) or (status <> 'cancelled' and cancelled_at is null))
);

create table public.transaction_settlements (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  transaction_id uuid not null,
  account_id uuid not null,
  amount numeric(19,4) not null check (amount > 0),
  settled_at timestamptz not null,
  idempotency_key text not null check (char_length(idempotency_key) between 16 and 200),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, idempotency_key),
  foreign key (tenant_id, transaction_id) references public.transactions(tenant_id, id) on delete restrict,
  foreign key (tenant_id, account_id) references public.accounts(tenant_id, id) on delete restrict
);

create table public.account_movements (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  account_id uuid not null,
  settlement_id uuid null,
  amount numeric(19,4) not null check (amount <> 0),
  effective_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, settlement_id),
  foreign key (tenant_id, account_id) references public.accounts(tenant_id, id) on delete restrict,
  foreign key (tenant_id, settlement_id) references public.transaction_settlements(tenant_id, id) on delete restrict
);

create index transactions_tenant_date_idx on public.transactions (tenant_id, competence_date desc, id desc);
create index transactions_tenant_status_idx on public.transactions (tenant_id, status, due_date);
create index transactions_tenant_account_idx on public.transactions (tenant_id, account_id);
create index transaction_settlements_transaction_idx on public.transaction_settlements (tenant_id, transaction_id, settled_at);
create index account_movements_account_date_idx on public.account_movements (tenant_id, account_id, effective_at desc, id desc);

create or replace function public.normalize_transaction_values()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.description = btrim(new.description);
  new.currency = upper(btrim(new.currency));
  if new.notes is not null then new.notes = nullif(btrim(new.notes), ''); end if;
  if new.status = 'cancelled' and new.cancelled_at is null then new.cancelled_at = now(); end if;
  if new.status <> 'cancelled' then new.cancelled_at = null; end if;
  return new;
end;
$$;

create or replace function public.validate_transaction_references()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare category_type text;
begin
  if new.category_id is not null then
    select type into category_type from public.categories where tenant_id = new.tenant_id and id = new.category_id;
    if category_type is not null and category_type is distinct from new.type then raise exception 'transaction category type must match transaction type'; end if;
  end if;
  return new;
end;
$$;

create or replace function public.validate_transaction_state()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare settled numeric(19,4) := 0;
begin
  select coalesce(sum(amount), 0) into settled from public.transaction_settlements where tenant_id = new.tenant_id and transaction_id = new.id;
  if new.status = 'planned' and settled > 0 then raise exception 'planned transaction cannot have settlements'; end if;
  if new.status = 'pending' and settled > 0 then raise exception 'pending transaction cannot have settlements'; end if;
  if new.status = 'partially_paid' and (settled <= 0 or settled >= new.amount) then raise exception 'partially paid status is inconsistent'; end if;
  if new.status = 'paid' and settled <> new.amount then raise exception 'paid status is inconsistent'; end if;
  if new.status = 'cancelled' and settled > 0 then raise exception 'settled transaction cannot be cancelled'; end if;
  return new;
end;
$$;

create or replace function public.protect_transaction_history()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.tenant_id is distinct from old.tenant_id or new.created_by is distinct from old.created_by then raise exception 'transaction identity cannot be changed'; end if;
  if exists (select 1 from public.transaction_settlements where tenant_id = old.tenant_id and transaction_id = old.id)
     and (new.amount is distinct from old.amount or new.currency is distinct from old.currency or new.type is distinct from old.type) then
    raise exception 'settled transaction financial fields cannot be changed';
  end if;
  if old.status = 'cancelled' and new.status <> 'cancelled' then raise exception 'cancelled transaction cannot be reopened'; end if;
  return new;
end;
$$;

create or replace function public.audit_transaction_changes()
returns trigger
language plpgsql security definer
set search_path = public, auth, pg_temp
as $$
begin
  perform public.write_audit_event(new.tenant_id, auth.uid(), case when tg_op = 'INSERT' then 'transaction.created' else 'transaction.updated' end, 'transaction', new.id, jsonb_build_object('type', new.type, 'amount', new.amount, 'currency', new.currency, 'status', new.status));
  return new;
end;
$$;

create or replace function public.audit_settlement_changes()
returns trigger
language plpgsql security definer
set search_path = public, auth, pg_temp
as $$
begin
  perform public.write_audit_event(new.tenant_id, auth.uid(), 'transaction.settled', 'transaction_settlement', new.id, jsonb_build_object('transaction_id', new.transaction_id, 'account_id', new.account_id, 'amount', new.amount));
  return new;
end;
$$;

create trigger transactions_normalize_values before insert or update on public.transactions for each row execute function public.normalize_transaction_values();
create trigger transactions_validate_references before insert or update on public.transactions for each row execute function public.validate_transaction_references();
create trigger transactions_validate_state before insert or update on public.transactions for each row execute function public.validate_transaction_state();
create trigger transactions_protect_history before update on public.transactions for each row execute function public.protect_transaction_history();
create trigger transactions_set_updated_at before update on public.transactions for each row execute function public.set_updated_at();
create trigger transactions_audit_changes after insert or update on public.transactions for each row execute function public.audit_transaction_changes();
create trigger settlements_audit_changes after insert on public.transaction_settlements for each row execute function public.audit_settlement_changes();

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
    if existing.transaction_id <> p_transaction_id or existing.account_id <> p_account_id or existing.amount <> p_amount then raise exception 'idempotency key payload mismatch'; end if;
    return existing;
  end if;
  if target.status = 'cancelled' then raise exception 'cancelled transaction cannot be settled'; end if;
  if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount, 4) then raise exception 'invalid settlement amount'; end if;
  if p_settled_at is null or p_settled_at > now() then raise exception 'settlement date cannot be in the future'; end if;
  select * into account from public.accounts where tenant_id = target.tenant_id and id = p_account_id for update;
  if not found or not account.is_active then raise exception 'active account is required'; end if;
  if account.currency <> target.currency then raise exception 'settlement currency must match transaction currency'; end if;
  select coalesce(sum(amount), 0) into settled from public.transaction_settlements where tenant_id = target.tenant_id and transaction_id = target.id;
  if p_amount > target.amount - settled then raise exception 'settlement exceeds pending amount'; end if;
  insert into public.transaction_settlements (tenant_id, transaction_id, account_id, amount, settled_at, idempotency_key, created_by)
  values (target.tenant_id, target.id, p_account_id, p_amount, p_settled_at, p_idempotency_key, auth.uid()) returning * into new_settlement;
  insert into public.account_movements (tenant_id, account_id, settlement_id, amount, effective_at)
  values (target.tenant_id, p_account_id, new_settlement.id, case when target.type = 'income' then p_amount else -p_amount end, p_settled_at);
  update public.transactions set status = case when settled + p_amount = target.amount then 'paid' else 'partially_paid' end where id = target.id;
  return new_settlement;
end;
$$;

alter table public.transactions enable row level security;
alter table public.transaction_settlements enable row level security;
alter table public.account_movements enable row level security;

create policy transactions_select_members on public.transactions for select to authenticated using (public.is_active_tenant_member(tenant_id));
create policy transactions_insert_editors on public.transactions for insert to authenticated with check (public.has_tenant_role(tenant_id, array['owner', 'admin', 'editor']) and created_by = auth.uid());
create policy transactions_update_editors on public.transactions for update to authenticated using (public.has_tenant_role(tenant_id, array['owner', 'admin', 'editor'])) with check (public.has_tenant_role(tenant_id, array['owner', 'admin', 'editor']));
create policy settlements_select_members on public.transaction_settlements for select to authenticated using (public.is_active_tenant_member(tenant_id));
create policy movements_select_members on public.account_movements for select to authenticated using (public.is_active_tenant_member(tenant_id));

revoke all on table public.transactions, public.transaction_settlements, public.account_movements from public, anon, authenticated;
grant select, insert, update on table public.transactions to authenticated;
grant select on table public.transaction_settlements, public.account_movements to authenticated;
revoke all on function public.settle_transaction(uuid, uuid, numeric, timestamptz, text) from public, anon;
grant execute on function public.settle_transaction(uuid, uuid, numeric, timestamptz, text) to authenticated;
revoke all on function public.normalize_transaction_values(), public.validate_transaction_references(), public.validate_transaction_state(), public.protect_transaction_history(), public.audit_transaction_changes(), public.audit_settlement_changes() from public, anon, authenticated;
