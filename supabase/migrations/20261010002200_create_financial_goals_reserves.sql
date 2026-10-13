-- FIN-032: metas e reservas patrimoniais.

create table public.financial_goals (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  target_amount numeric(19,4) not null check (target_amount > 0 and target_amount = round(target_amount, 4)),
  currency varchar(3) not null check (currency ~ '^[A-Z]{3}$'),
  target_date date null,
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id)
);

create table public.financial_reserves (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  goal_id uuid null,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  currency varchar(3) not null check (currency ~ '^[A-Z]{3}$'),
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, goal_id),
  foreign key (tenant_id, goal_id) references public.financial_goals(tenant_id, id) on delete restrict
);

create table public.reserve_movements (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  reserve_id uuid not null,
  account_id uuid not null,
  account_movement_id uuid not null,
  kind text not null check (kind in ('allocation', 'withdrawal')),
  amount numeric(19,4) not null check (amount <> 0 and amount = round(amount, 4)),
  currency varchar(3) not null check (currency ~ '^[A-Z]{3}$'),
  effective_at timestamptz not null,
  idempotency_key text not null check (char_length(idempotency_key) between 16 and 200),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, idempotency_key),
  unique (tenant_id, account_movement_id),
  foreign key (tenant_id, reserve_id) references public.financial_reserves(tenant_id, id) on delete restrict,
  foreign key (tenant_id, account_id) references public.accounts(tenant_id, id) on delete restrict,
  check ((kind = 'allocation' and amount > 0) or (kind = 'withdrawal' and amount < 0))
);

alter table public.account_movements add column reserve_movement_id uuid null;
alter table public.account_movements drop constraint if exists account_movements_origin_check;
alter table public.account_movements add constraint account_movements_origin_check check (
  ((settlement_id is not null)::int + (transfer_id is not null)::int + (card_invoice_payment_id is not null)::int + (reserve_movement_id is not null)::int + (reversal_of_id is not null)::int) = 1
);
alter table public.account_movements add constraint account_movements_reserve_movement_fk
  foreign key (tenant_id, reserve_movement_id) references public.reserve_movements(tenant_id, id) on delete restrict;
alter table public.reserve_movements add constraint reserve_movements_account_movement_fk
  foreign key (tenant_id, account_movement_id) references public.account_movements(tenant_id, id) on delete restrict deferrable initially deferred;

create index financial_goals_tenant_status_idx on public.financial_goals (tenant_id, status, target_date);
create index financial_reserves_tenant_active_idx on public.financial_reserves (tenant_id, is_active, name);
create index reserve_movements_reserve_date_idx on public.reserve_movements (tenant_id, reserve_id, effective_at desc);
create index reserve_movements_account_date_idx on public.reserve_movements (tenant_id, account_id, effective_at desc);
create trigger financial_goals_set_updated_at before update on public.financial_goals for each row execute function public.set_updated_at();
create trigger financial_reserves_set_updated_at before update on public.financial_reserves for each row execute function public.set_updated_at();

create or replace function public.audit_financial_goal_changes()
returns trigger language plpgsql security definer set search_path = public, auth, pg_temp as $$
begin
  perform public.write_audit_event(new.tenant_id, auth.uid(), case when tg_op = 'INSERT' then 'financial_goal.created' else 'financial_goal.updated' end, 'financial_goal', new.id, jsonb_build_object('name', new.name, 'target_amount', new.target_amount, 'currency', new.currency, 'status', new.status));
  return new;
end;
$$;
create trigger financial_goals_audit_changes after insert or update on public.financial_goals for each row execute function public.audit_financial_goal_changes();

create or replace function public.audit_financial_reserve_changes()
returns trigger language plpgsql security definer set search_path = public, auth, pg_temp as $$
begin
  perform public.write_audit_event(new.tenant_id, auth.uid(), case when tg_op = 'INSERT' then 'financial_reserve.created' else 'financial_reserve.updated' end, 'financial_reserve', new.id, jsonb_build_object('goal_id', new.goal_id, 'name', new.name, 'currency', new.currency, 'is_active', new.is_active));
  return new;
end;
$$;
create trigger financial_reserves_audit_changes after insert or update on public.financial_reserves for each row execute function public.audit_financial_reserve_changes();

create or replace function public.audit_reserve_movement_changes()
returns trigger language plpgsql security definer set search_path = public, auth, pg_temp as $$
begin
  perform public.write_audit_event(new.tenant_id, auth.uid(), 'reserve_movement.created', 'reserve_movement', new.id, jsonb_build_object('reserve_id', new.reserve_id, 'account_id', new.account_id, 'kind', new.kind, 'amount', new.amount, 'currency', new.currency));
  return new;
end;
$$;
create trigger reserve_movements_audit_changes after insert on public.reserve_movements for each row execute function public.audit_reserve_movement_changes();

create or replace function public.create_financial_goal(p_tenant_id uuid, p_name text, p_target_amount numeric, p_currency text, p_target_date date)
returns public.financial_goals language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare result public.financial_goals;
begin
  if not public.has_tenant_role(p_tenant_id, array['owner', 'admin', 'editor']) then raise exception 'financial goal permission denied'; end if;
  if p_target_amount is null or p_target_amount <= 0 or p_target_amount <> round(p_target_amount, 4) then raise exception 'invalid goal target'; end if;
  if p_currency is null or p_currency !~ '^[A-Z]{3}$' then raise exception 'invalid goal currency'; end if;
  insert into public.financial_goals (tenant_id, name, target_amount, currency, target_date, created_by)
  values (p_tenant_id, btrim(p_name), p_target_amount, upper(btrim(p_currency)), p_target_date, auth.uid()) returning * into result;
  return result;
end;
$$;

create or replace function public.update_financial_goal(p_tenant_id uuid, p_goal_id uuid, p_name text, p_target_amount numeric, p_target_date date, p_status text)
returns public.financial_goals language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare result public.financial_goals;
begin
  if not public.has_tenant_role(p_tenant_id, array['owner', 'admin', 'editor']) then raise exception 'financial goal permission denied'; end if;
  if p_target_amount is null or p_target_amount <= 0 or p_target_amount <> round(p_target_amount, 4) then raise exception 'invalid goal target'; end if;
  if p_status not in ('active', 'completed', 'archived') then raise exception 'invalid goal status'; end if;
  update public.financial_goals set name = btrim(p_name), target_amount = p_target_amount, target_date = p_target_date, status = p_status where tenant_id = p_tenant_id and id = p_goal_id returning * into result;
  if not found then raise exception 'financial goal not found'; end if;
  return result;
end;
$$;

create or replace function public.create_financial_reserve(p_tenant_id uuid, p_goal_id uuid, p_name text, p_currency text)
returns public.financial_reserves language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare result public.financial_reserves; goal public.financial_goals;
begin
  if not public.has_tenant_role(p_tenant_id, array['owner', 'admin', 'editor']) then raise exception 'financial reserve permission denied'; end if;
  if p_currency is null or p_currency !~ '^[A-Z]{3}$' then raise exception 'invalid reserve currency'; end if;
  if p_goal_id is not null then
    select * into goal from public.financial_goals where tenant_id = p_tenant_id and id = p_goal_id;
    if not found then raise exception 'financial goal not found'; end if;
    if goal.currency <> upper(btrim(p_currency)) then raise exception 'reserve currency must match goal'; end if;
  end if;
  insert into public.financial_reserves (tenant_id, goal_id, name, currency, created_by)
  values (p_tenant_id, p_goal_id, btrim(p_name), upper(btrim(p_currency)), auth.uid()) returning * into result;
  return result;
end;
$$;

create or replace function public.get_reserve_balance(p_tenant_id uuid, p_reserve_id uuid)
returns numeric language sql security definer set search_path = public, auth, pg_temp as $$
  select coalesce(sum(m.amount), 0)::numeric(19,4)
  from public.reserve_movements m
  where m.tenant_id = p_tenant_id and m.reserve_id = p_reserve_id
    and public.is_active_tenant_member(p_tenant_id)
$$;

create or replace function public.get_goal_progress(p_tenant_id uuid, p_goal_id uuid)
returns numeric language sql security definer set search_path = public, auth, pg_temp as $$
  select least(100, greatest(0, coalesce((select sum(m.amount) from public.reserve_movements m join public.financial_reserves r on r.tenant_id = m.tenant_id and r.id = m.reserve_id where r.tenant_id = p_tenant_id and r.goal_id = p_goal_id), 0) / nullif(g.target_amount, 0) * 100))::numeric(19,4)
  from public.financial_goals g
  where g.tenant_id = p_tenant_id and g.id = p_goal_id and public.is_active_tenant_member(p_tenant_id)
$$;

create or replace function public.allocate_to_reserve(p_tenant_id uuid, p_reserve_id uuid, p_account_id uuid, p_amount numeric, p_effective_at timestamptz, p_idempotency_key text)
returns public.reserve_movements language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare reserve public.financial_reserves; account public.accounts; existing public.reserve_movements; created public.reserve_movements; balance numeric(19,4); movement_id uuid := extensions.gen_random_uuid();
begin
  if auth.uid() is null or not public.has_tenant_role(p_tenant_id, array['owner', 'admin', 'editor']) then raise exception 'reserve allocation permission denied'; end if;
  if p_idempotency_key is null or char_length(p_idempotency_key) not between 16 and 200 then raise exception 'invalid reserve idempotency key'; end if;
  select * into existing from public.reserve_movements where tenant_id = p_tenant_id and idempotency_key = p_idempotency_key for update;
  if existing.id is not null then if existing.reserve_id <> p_reserve_id or existing.account_id <> p_account_id or existing.amount <> p_amount then raise exception 'reserve idempotency key payload mismatch'; end if; return existing; end if;
  if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount, 4) then raise exception 'invalid reserve allocation amount'; end if;
  if p_effective_at is null or p_effective_at > now() then raise exception 'reserve date cannot be in the future'; end if;
  select * into account from public.accounts where tenant_id = p_tenant_id and id = p_account_id for update;
  if not found or not account.is_active then raise exception 'active reserve account is required'; end if;
  select * into reserve from public.financial_reserves where tenant_id = p_tenant_id and id = p_reserve_id for update;
  if not found or not reserve.is_active then raise exception 'active reserve is required'; end if;
  if account.currency <> reserve.currency then raise exception 'reserve currency must match account'; end if;
  select a.opening_balance + coalesce(sum(m.amount), 0) into balance from public.accounts a left join public.account_movements m on m.tenant_id = a.tenant_id and m.account_id = a.id where a.tenant_id = p_tenant_id and a.id = p_account_id group by a.opening_balance;
  if p_amount > balance then raise exception 'reserve allocation exceeds available balance'; end if;
  insert into public.reserve_movements (tenant_id, reserve_id, account_id, account_movement_id, kind, amount, currency, effective_at, idempotency_key, created_by)
  values (p_tenant_id, p_reserve_id, p_account_id, movement_id, 'allocation', p_amount, reserve.currency, p_effective_at, p_idempotency_key, auth.uid()) returning * into created;
  insert into public.account_movements (id, tenant_id, account_id, reserve_movement_id, amount, effective_at) values (movement_id, p_tenant_id, p_account_id, created.id, -p_amount, p_effective_at);
  return created;
end;
$$;

create or replace function public.withdraw_from_reserve(p_tenant_id uuid, p_reserve_id uuid, p_account_id uuid, p_amount numeric, p_effective_at timestamptz, p_idempotency_key text)
returns public.reserve_movements language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare reserve public.financial_reserves; account public.accounts; existing public.reserve_movements; created public.reserve_movements; balance numeric(19,4); movement_id uuid := extensions.gen_random_uuid();
begin
  if auth.uid() is null or not public.has_tenant_role(p_tenant_id, array['owner', 'admin', 'editor']) then raise exception 'reserve withdrawal permission denied'; end if;
  if p_idempotency_key is null or char_length(p_idempotency_key) not between 16 and 200 then raise exception 'invalid reserve idempotency key'; end if;
  select * into existing from public.reserve_movements where tenant_id = p_tenant_id and idempotency_key = p_idempotency_key for update;
  if existing.id is not null then if existing.reserve_id <> p_reserve_id or existing.account_id <> p_account_id or existing.amount <> -p_amount then raise exception 'reserve idempotency key payload mismatch'; end if; return existing; end if;
  if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount, 4) then raise exception 'invalid reserve withdrawal amount'; end if;
  if p_effective_at is null or p_effective_at > now() then raise exception 'reserve date cannot be in the future'; end if;
  select * into account from public.accounts where tenant_id = p_tenant_id and id = p_account_id for update;
  if not found or not account.is_active then raise exception 'active reserve account is required'; end if;
  select * into reserve from public.financial_reserves where tenant_id = p_tenant_id and id = p_reserve_id for update;
  if not found or not reserve.is_active then raise exception 'active reserve is required'; end if;
  if account.currency <> reserve.currency then raise exception 'reserve currency must match account'; end if;
  select coalesce(sum(m.amount), 0) into balance from public.reserve_movements m where m.tenant_id = p_tenant_id and m.reserve_id = p_reserve_id;
  if p_amount > balance then raise exception 'reserve withdrawal exceeds available balance'; end if;
  insert into public.reserve_movements (tenant_id, reserve_id, account_id, account_movement_id, kind, amount, currency, effective_at, idempotency_key, created_by)
  values (p_tenant_id, p_reserve_id, p_account_id, movement_id, 'withdrawal', -p_amount, reserve.currency, p_effective_at, p_idempotency_key, auth.uid()) returning * into created;
  insert into public.account_movements (id, tenant_id, account_id, reserve_movement_id, amount, effective_at) values (movement_id, p_tenant_id, p_account_id, created.id, p_amount, p_effective_at);
  return created;
end;
$$;

alter table public.financial_goals enable row level security;
alter table public.financial_reserves enable row level security;
alter table public.reserve_movements enable row level security;
create policy financial_goals_select_members on public.financial_goals for select to authenticated using (public.is_active_tenant_member(tenant_id));
create policy financial_reserves_select_members on public.financial_reserves for select to authenticated using (public.is_active_tenant_member(tenant_id));
create policy reserve_movements_select_members on public.reserve_movements for select to authenticated using (public.is_active_tenant_member(tenant_id));
revoke all on table public.financial_goals, public.financial_reserves, public.reserve_movements from public, anon, authenticated;
grant select on table public.financial_goals, public.financial_reserves, public.reserve_movements to authenticated;
revoke all on function public.audit_financial_goal_changes(), public.audit_financial_reserve_changes(), public.audit_reserve_movement_changes(), public.create_financial_goal(uuid,text,numeric,text,date), public.update_financial_goal(uuid,uuid,text,numeric,date,text), public.create_financial_reserve(uuid,uuid,text,text), public.get_reserve_balance(uuid,uuid), public.get_goal_progress(uuid,uuid), public.allocate_to_reserve(uuid,uuid,uuid,numeric,timestamptz,text), public.withdraw_from_reserve(uuid,uuid,uuid,numeric,timestamptz,text) from public, anon, authenticated;
grant execute on function public.create_financial_goal(uuid,text,numeric,text,date), public.update_financial_goal(uuid,uuid,text,numeric,date,text), public.create_financial_reserve(uuid,uuid,text,text), public.get_reserve_balance(uuid,uuid), public.get_goal_progress(uuid,uuid), public.allocate_to_reserve(uuid,uuid,uuid,numeric,timestamptz,text), public.withdraw_from_reserve(uuid,uuid,uuid,numeric,timestamptz,text) to authenticated;
