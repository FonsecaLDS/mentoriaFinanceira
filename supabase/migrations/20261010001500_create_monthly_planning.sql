-- FIN-024: planejamento mensal separado de transações e saldos efetivos.

create table public.monthly_plans (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  plan_year smallint not null check (plan_year between 2000 and 2100),
  plan_month smallint not null check (plan_month between 1 and 12),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, plan_year, plan_month)
);

create table public.monthly_plan_items (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null,
  plan_id uuid not null,
  type text not null check (type in ('income', 'expense')),
  category_id uuid null,
  account_id uuid null,
  person_id uuid null,
  currency varchar(3) not null check (currency ~ '^[A-Z]{3}$'),
  amount numeric(19,4) not null check (amount >= 0 and amount = round(amount, 4)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, plan_id) references public.monthly_plans(tenant_id, id) on delete cascade,
  foreign key (tenant_id, category_id) references public.categories(tenant_id, id) on delete restrict,
  foreign key (tenant_id, account_id) references public.accounts(tenant_id, id) on delete restrict,
  foreign key (tenant_id, person_id) references public.people(tenant_id, id) on delete restrict
);

create unique index monthly_plan_items_dimension_idx on public.monthly_plan_items
  (tenant_id, plan_id, type, currency, coalesce(category_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(account_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(person_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index monthly_plans_tenant_period_idx on public.monthly_plans (tenant_id, plan_year, plan_month);
create index monthly_plan_items_category_idx on public.monthly_plan_items (tenant_id, category_id);
create index monthly_plan_items_account_idx on public.monthly_plan_items (tenant_id, account_id);
create index monthly_plan_items_person_idx on public.monthly_plan_items (tenant_id, person_id);

create or replace function public.touch_monthly_plan()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin new.updated_at = now(); return new; end; $$;
create trigger monthly_plans_touch before update on public.monthly_plans for each row execute function public.touch_monthly_plan();
create trigger monthly_plan_items_touch before update on public.monthly_plan_items for each row execute function public.touch_monthly_plan();

create or replace function public.validate_monthly_plan_item()
returns trigger language plpgsql set search_path = public, pg_temp as $$
declare category_type text; account_currency text;
begin
  if new.category_id is not null then
    select c.type into category_type from public.categories c where c.tenant_id = new.tenant_id and c.id = new.category_id;
    if category_type is distinct from new.type then raise exception 'planning category type must match item type'; end if;
  end if;
  if new.account_id is not null then
    select a.currency into account_currency from public.accounts a where a.tenant_id = new.tenant_id and a.id = new.account_id;
    if account_currency is distinct from new.currency then raise exception 'planning currency must match account'; end if;
  end if;
  return new;
end; $$;
create trigger monthly_plan_items_validate before insert or update on public.monthly_plan_items for each row execute function public.validate_monthly_plan_item();

create or replace function public.audit_monthly_plan_changes()
returns trigger language plpgsql security definer set search_path = public, auth, pg_temp as $$
begin
  perform public.write_audit_event(new.tenant_id, auth.uid(), case when tg_op = 'INSERT' then 'planning.item_created' else 'planning.item_updated' end, 'monthly_plan_item', new.id, jsonb_build_object('plan_id', new.plan_id, 'type', new.type, 'amount', new.amount, 'currency', new.currency));
  return new;
end; $$;
create trigger monthly_plan_items_audit after insert or update on public.monthly_plan_items for each row execute function public.audit_monthly_plan_changes();

alter table public.monthly_plans enable row level security;
alter table public.monthly_plan_items enable row level security;
create policy monthly_plans_select_members on public.monthly_plans for select to authenticated using (public.is_active_tenant_member(tenant_id));
create policy monthly_plan_items_select_members on public.monthly_plan_items for select to authenticated using (public.is_active_tenant_member(tenant_id));
revoke all on public.monthly_plans, public.monthly_plan_items from public, anon, authenticated;
grant select on public.monthly_plans, public.monthly_plan_items to authenticated;

create or replace function public.upsert_monthly_plan_item(
  p_tenant_id uuid, p_year smallint, p_month smallint, p_type text, p_amount numeric, p_currency varchar(3),
  p_category_id uuid default null, p_account_id uuid default null, p_person_id uuid default null
)
returns public.monthly_plan_items language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare plan_row public.monthly_plans; item public.monthly_plan_items;
begin
  if auth.uid() is null or not public.has_tenant_role(p_tenant_id, array['owner', 'admin', 'editor']) then raise exception 'planning permission denied' using errcode = '42501'; end if;
  if p_year not between 2000 and 2100 or p_month not between 1 and 12 then raise exception 'invalid planning period'; end if;
  if p_type not in ('income', 'expense') or p_amount is null or p_amount < 0 or p_amount <> round(p_amount, 4) then raise exception 'invalid planning item'; end if;
  insert into public.monthly_plans (tenant_id, plan_year, plan_month, created_by) values (p_tenant_id, p_year, p_month, auth.uid())
    on conflict (tenant_id, plan_year, plan_month) do update set updated_at = now() returning * into plan_row;
  insert into public.monthly_plan_items (tenant_id, plan_id, type, category_id, account_id, person_id, currency, amount)
    values (p_tenant_id, plan_row.id, p_type, p_category_id, p_account_id, p_person_id, upper(trim(p_currency)), p_amount)
    on conflict (tenant_id, plan_id, type, currency, coalesce(category_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(account_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(person_id, '00000000-0000-0000-0000-000000000000'::uuid))
    do update set amount = excluded.amount, updated_at = now() returning * into item;
  return item;
end; $$;

create or replace function public.get_monthly_plan(p_tenant_id uuid, p_year smallint, p_month smallint)
returns table (id uuid, tenant_id uuid, plan_id uuid, type text, category_id uuid, account_id uuid, person_id uuid, currency varchar(3), amount numeric(19,4))
language plpgsql security invoker set search_path = public, auth, pg_temp as $$
begin
  if not public.is_active_tenant_member(p_tenant_id) then raise exception 'planning permission denied' using errcode = '42501'; end if;
  return query select i.id, i.tenant_id, i.plan_id, i.type, i.category_id, i.account_id, i.person_id, i.currency, i.amount
    from public.monthly_plan_items i join public.monthly_plans p on p.tenant_id = i.tenant_id and p.id = i.plan_id
    where i.tenant_id = p_tenant_id and p.plan_year = p_year and p.plan_month = p_month order by i.type, i.currency, i.id;
end; $$;

create or replace function public.get_monthly_comparison(
  p_tenant_id uuid, p_year smallint, p_month smallint, p_regime text default 'competence',
  p_category_id uuid default null, p_account_id uuid default null, p_person_id uuid default null
)
returns table (currency varchar(3), type text, category_id uuid, account_id uuid, person_id uuid, planned numeric(19,4), actual numeric(19,4), variance numeric(19,4), usage_percentage numeric(9,2))
language plpgsql security invoker set search_path = public, auth, pg_temp as $$
begin
  if not public.is_active_tenant_member(p_tenant_id) then raise exception 'planning permission denied' using errcode = '42501'; end if;
  if p_regime not in ('competence', 'cash') then raise exception 'invalid planning regime'; end if;
  return query
  with planned as (
    select i.currency, i.type, i.category_id, i.account_id, i.person_id, sum(i.amount)::numeric(19,4) amount
    from public.monthly_plan_items i join public.monthly_plans p on p.tenant_id = i.tenant_id and p.id = i.plan_id
    where i.tenant_id = p_tenant_id and p.plan_year = p_year and p.plan_month = p_month
      and (p_category_id is null or i.category_id = p_category_id) and (p_account_id is null or i.account_id = p_account_id) and (p_person_id is null or i.person_id = p_person_id)
    group by i.currency, i.type, i.category_id, i.account_id, i.person_id
  ), actual_rows as (
    select t.currency, t.type, t.category_id, t.account_id, t.person_id, t.amount
    from public.transactions t
    where p_regime = 'competence' and t.tenant_id = p_tenant_id and t.status <> 'cancelled'
      and extract(year from t.competence_date) = p_year and extract(month from t.competence_date) = p_month
      and (p_category_id is null or t.category_id = p_category_id) and (p_account_id is null or t.account_id = p_account_id) and (p_person_id is null or t.person_id = p_person_id)
    union all
    select t.currency, t.type, t.category_id, t.account_id, t.person_id, s.amount
    from public.transaction_settlements s join public.transactions t on t.tenant_id = s.tenant_id and t.id = s.transaction_id
    where p_regime = 'cash' and s.tenant_id = p_tenant_id and s.reversed_at is null
      and extract(year from s.settled_at) = p_year and extract(month from s.settled_at) = p_month
      and (p_category_id is null or t.category_id = p_category_id) and (p_account_id is null or t.account_id = p_account_id) and (p_person_id is null or t.person_id = p_person_id)
  ), actual as (
    select ar.currency, ar.type, ar.category_id, ar.account_id, ar.person_id, sum(ar.amount)::numeric(19,4) amount from actual_rows ar group by ar.currency, ar.type, ar.category_id, ar.account_id, ar.person_id
  ), keys as (
    select p.currency, p.type, p.category_id, p.account_id, p.person_id from planned p union select a.currency, a.type, a.category_id, a.account_id, a.person_id from actual a
  )
  select k.currency, k.type, k.category_id, k.account_id, k.person_id, coalesce(p.amount, 0)::numeric(19,4), coalesce(a.amount, 0)::numeric(19,4), (coalesce(a.amount, 0) - coalesce(p.amount, 0))::numeric(19,4), case when coalesce(p.amount, 0) = 0 then 0::numeric else round(coalesce(a.amount, 0) / p.amount * 100, 2) end
  from keys k left join planned p using (currency, type, category_id, account_id, person_id) left join actual a using (currency, type, category_id, account_id, person_id)
  order by k.currency, k.type, k.category_id nulls last, k.account_id nulls last;
end; $$;

create or replace function public.get_monthly_summary(p_tenant_id uuid, p_year smallint, p_month smallint, p_regime text default 'competence')
returns table (currency varchar(3), planned_income numeric(19,4), actual_income numeric(19,4), planned_expense numeric(19,4), actual_expense numeric(19,4), planned_result numeric(19,4), actual_result numeric(19,4), income_variance numeric(19,4), expense_variance numeric(19,4), budget_usage_percentage numeric(9,2))
language plpgsql security invoker set search_path = public, auth, pg_temp as $$
begin
  return query select c.currency,
    coalesce(sum(x.planned) filter (where x.type = 'income'), 0)::numeric(19,4), coalesce(sum(x.actual) filter (where x.type = 'income'), 0)::numeric(19,4),
    coalesce(sum(x.planned) filter (where x.type = 'expense'), 0)::numeric(19,4), coalesce(sum(x.actual) filter (where x.type = 'expense'), 0)::numeric(19,4),
    (coalesce(sum(x.planned) filter (where x.type = 'income'), 0) - coalesce(sum(x.planned) filter (where x.type = 'expense'), 0))::numeric(19,4),
    (coalesce(sum(x.actual) filter (where x.type = 'income'), 0) - coalesce(sum(x.actual) filter (where x.type = 'expense'), 0))::numeric(19,4),
    (coalesce(sum(x.actual) filter (where x.type = 'income'), 0) - coalesce(sum(x.planned) filter (where x.type = 'income'), 0))::numeric(19,4),
    (coalesce(sum(x.actual) filter (where x.type = 'expense'), 0) - coalesce(sum(x.planned) filter (where x.type = 'expense'), 0))::numeric(19,4),
    case when coalesce(sum(x.planned) filter (where x.type = 'expense'), 0) = 0 then 0::numeric else round(coalesce(sum(x.actual) filter (where x.type = 'expense'), 0) / sum(x.planned) filter (where x.type = 'expense') * 100, 2) end
  from (select distinct mc.currency from public.get_monthly_comparison(p_tenant_id, p_year, p_month, p_regime) mc) c
  join lateral public.get_monthly_comparison(p_tenant_id, p_year, p_month, p_regime) x on x.currency = c.currency
  group by c.currency order by c.currency;
end; $$;

create or replace function public.copy_monthly_plan(p_tenant_id uuid, p_from_year smallint, p_from_month smallint, p_to_year smallint, p_to_month smallint)
returns integer language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare source_plan public.monthly_plans; target_plan public.monthly_plans; copied integer;
begin
  if auth.uid() is null or not public.has_tenant_role(p_tenant_id, array['owner', 'admin', 'editor']) then raise exception 'planning permission denied' using errcode = '42501'; end if;
  select * into source_plan from public.monthly_plans where tenant_id = p_tenant_id and plan_year = p_from_year and plan_month = p_from_month;
  if not found then raise exception 'source planning period not found'; end if;
  insert into public.monthly_plans (tenant_id, plan_year, plan_month, created_by) values (p_tenant_id, p_to_year, p_to_month, auth.uid())
    on conflict (tenant_id, plan_year, plan_month) do update set updated_at = now() returning * into target_plan;
  insert into public.monthly_plan_items (tenant_id, plan_id, type, category_id, account_id, person_id, currency, amount)
    select tenant_id, target_plan.id, type, category_id, account_id, person_id, currency, amount from public.monthly_plan_items
    where tenant_id = p_tenant_id and plan_id = source_plan.id
    on conflict (tenant_id, plan_id, type, currency, coalesce(category_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(account_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(person_id, '00000000-0000-0000-0000-000000000000'::uuid)) do nothing;
  get diagnostics copied = row_count;
  return copied;
end; $$;

revoke all on function public.upsert_monthly_plan_item(uuid, smallint, smallint, text, numeric, varchar, uuid, uuid, uuid), public.copy_monthly_plan(uuid, smallint, smallint, smallint, smallint), public.get_monthly_plan(uuid, smallint, smallint), public.get_monthly_comparison(uuid, smallint, smallint, text, uuid, uuid, uuid), public.get_monthly_summary(uuid, smallint, smallint, text) from public, anon;
grant execute on function public.upsert_monthly_plan_item(uuid, smallint, smallint, text, numeric, varchar, uuid, uuid, uuid), public.copy_monthly_plan(uuid, smallint, smallint, smallint, smallint), public.get_monthly_plan(uuid, smallint, smallint), public.get_monthly_comparison(uuid, smallint, smallint, text, uuid, uuid, uuid), public.get_monthly_summary(uuid, smallint, smallint, text) to authenticated;
