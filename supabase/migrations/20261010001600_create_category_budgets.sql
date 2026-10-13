-- FIN-025: limites mensais por categoria, sem duplicar o livro financeiro.

create table public.category_budgets (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  category_id uuid not null,
  budget_year smallint not null check (budget_year between 2000 and 2100),
  budget_month smallint not null check (budget_month between 1 and 12),
  currency varchar(3) not null check (currency ~ '^[A-Z]{3}$'),
  limit_amount numeric(19,4) not null check (limit_amount >= 0 and limit_amount = round(limit_amount, 4)),
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, category_id, budget_year, budget_month, currency),
  foreign key (tenant_id, category_id) references public.categories(tenant_id, id) on delete restrict
);

create index category_budgets_period_idx on public.category_budgets (tenant_id, budget_year, budget_month, currency);
create index category_budgets_category_idx on public.category_budgets (tenant_id, category_id);

create or replace function public.touch_category_budget()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin new.updated_at = now(); return new; end; $$;
create trigger category_budgets_touch before update on public.category_budgets for each row execute function public.touch_category_budget();

create or replace function public.audit_category_budget_changes()
returns trigger language plpgsql security definer set search_path = public, auth, pg_temp as $$
begin
  perform public.write_audit_event(new.tenant_id, auth.uid(), case when tg_op = 'INSERT' then 'budget.created' else 'budget.updated' end, 'category_budget', new.id, jsonb_build_object('category_id', new.category_id, 'year', new.budget_year, 'month', new.budget_month, 'currency', new.currency, 'limit_amount', new.limit_amount, 'is_active', new.is_active));
  return new;
end; $$;
create trigger category_budgets_audit after insert or update on public.category_budgets for each row execute function public.audit_category_budget_changes();

alter table public.category_budgets enable row level security;
create policy category_budgets_select_members on public.category_budgets for select to authenticated using (public.is_active_tenant_member(tenant_id));
revoke all on public.category_budgets from public, anon, authenticated;
grant select on public.category_budgets to authenticated;

create or replace function public.upsert_category_budget(
  p_tenant_id uuid, p_category_id uuid, p_year smallint, p_month smallint, p_currency varchar(3), p_limit_amount numeric
)
returns public.category_budgets language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare category_row public.categories; budget public.category_budgets;
begin
  if auth.uid() is null or not public.has_tenant_role(p_tenant_id, array['owner', 'admin', 'editor']) then raise exception 'budget permission denied' using errcode = '42501'; end if;
  if p_year not between 2000 and 2100 or p_month not between 1 and 12 or p_currency !~ '^[A-Z]{3}$' or p_limit_amount is null or p_limit_amount < 0 or p_limit_amount <> round(p_limit_amount, 4) then raise exception 'invalid category budget'; end if;
  select * into category_row from public.categories where tenant_id = p_tenant_id and id = p_category_id;
  if not found or category_row.type <> 'expense' then raise exception 'expense category is required'; end if;
  if exists (select 1 from public.categories child where child.tenant_id = p_tenant_id and child.parent_id = category_row.id and child.is_active) then raise exception 'budget must target a leaf category'; end if;
  insert into public.category_budgets (tenant_id, category_id, budget_year, budget_month, currency, limit_amount, is_active, created_by)
    values (p_tenant_id, p_category_id, p_year, p_month, upper(trim(p_currency)), p_limit_amount, true, auth.uid())
    on conflict (tenant_id, category_id, budget_year, budget_month, currency)
    do update set limit_amount = excluded.limit_amount, is_active = true, updated_at = now()
    returning * into budget;
  return budget;
end; $$;

create or replace function public.remove_category_budget(p_tenant_id uuid, p_budget_id uuid)
returns public.category_budgets language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare budget public.category_budgets;
begin
  if auth.uid() is null or not public.has_tenant_role(p_tenant_id, array['owner', 'admin', 'editor']) then raise exception 'budget permission denied' using errcode = '42501'; end if;
  update public.category_budgets set is_active = false where tenant_id = p_tenant_id and id = p_budget_id returning * into budget;
  if not found then raise exception 'category budget not found'; end if;
  return budget;
end; $$;

create or replace function public.get_budget_consumption(
  p_tenant_id uuid, p_year smallint, p_month smallint, p_regime text default 'competence', p_currency varchar(3) default null
)
returns table (budget_id uuid, category_id uuid, category_name text, currency varchar(3), limit_amount numeric(19,4), spent numeric(19,4), remaining numeric(19,4), usage_percentage numeric(9,2), variance numeric(19,4), alert_level text)
language plpgsql security invoker set search_path = public, auth, pg_temp as $$
begin
  if not public.is_active_tenant_member(p_tenant_id) then raise exception 'budget permission denied' using errcode = '42501'; end if;
  if p_regime not in ('competence', 'cash') then raise exception 'invalid budget regime'; end if;
  return query
  with spent as (
    select t.category_id, t.currency, sum(t.amount)::numeric(19,4) amount
    from public.transactions t join public.categories c on c.tenant_id = t.tenant_id and c.id = t.category_id
    where p_regime = 'competence' and t.tenant_id = p_tenant_id and t.type = 'expense' and t.status <> 'cancelled' and c.budget_group <> 'savings'
      and extract(year from t.competence_date) = p_year and extract(month from t.competence_date) = p_month group by t.category_id, t.currency
    union all
    select t.category_id, t.currency, sum(s.amount)::numeric(19,4)
    from public.transaction_settlements s join public.transactions t on t.tenant_id = s.tenant_id and t.id = s.transaction_id join public.categories c on c.tenant_id = t.tenant_id and c.id = t.category_id
    where p_regime = 'cash' and s.tenant_id = p_tenant_id and t.type = 'expense' and s.reversed_at is null and c.budget_group <> 'savings'
      and extract(year from s.settled_at) = p_year and extract(month from s.settled_at) = p_month group by t.category_id, t.currency
  ), aggregated as (select s.category_id, s.currency, sum(s.amount)::numeric(19,4) amount from spent s group by s.category_id, s.currency)
  select b.id, b.category_id, c.name, b.currency, b.limit_amount, coalesce(a.amount, 0)::numeric(19,4), (b.limit_amount - coalesce(a.amount, 0))::numeric(19,4), case when b.limit_amount = 0 then 0::numeric else round(coalesce(a.amount, 0) / b.limit_amount * 100, 2) end, (coalesce(a.amount, 0) - b.limit_amount)::numeric(19,4), case when coalesce(a.amount, 0) >= b.limit_amount and b.limit_amount > 0 then 'exceeded' when b.limit_amount = 0 and coalesce(a.amount, 0) > 0 then 'exceeded' when b.limit_amount > 0 and coalesce(a.amount, 0) >= b.limit_amount * 0.8 then 'warning' else 'normal' end
  from public.category_budgets b join public.categories c on c.tenant_id = b.tenant_id and c.id = b.category_id left join aggregated a on a.category_id = b.category_id and a.currency = b.currency
  where b.tenant_id = p_tenant_id and b.budget_year = p_year and b.budget_month = p_month and b.is_active and (p_currency is null or b.currency = p_currency)
  order by b.currency, c.name;
end; $$;

create or replace function public.get_monthly_budgets(p_tenant_id uuid, p_year smallint, p_month smallint, p_regime text default 'competence', p_currency varchar(3) default null)
returns setof public.category_budgets language sql security invoker set search_path = public, auth, pg_temp as $$
  select b.* from public.category_budgets b where b.tenant_id = p_tenant_id and b.budget_year = p_year and b.budget_month = p_month and b.is_active and (p_currency is null or b.currency = p_currency) order by b.currency, b.category_id;
$$;

create or replace function public.get_budget_alerts(p_tenant_id uuid, p_year smallint, p_month smallint, p_regime text default 'competence')
returns table (budget_id uuid, category_id uuid, category_name text, currency varchar(3), usage_percentage numeric(9,2), alert_level text)
language sql security invoker set search_path = public, auth, pg_temp as $$
  select budget_id, category_id, category_name, currency, usage_percentage, alert_level from public.get_budget_consumption(p_tenant_id, p_year, p_month, p_regime) where alert_level in ('warning', 'exceeded');
$$;

revoke all on function public.upsert_category_budget(uuid, uuid, smallint, smallint, varchar, numeric), public.remove_category_budget(uuid, uuid), public.get_budget_consumption(uuid, smallint, smallint, text, varchar), public.get_monthly_budgets(uuid, smallint, smallint, text, varchar), public.get_budget_alerts(uuid, smallint, smallint, text) from public, anon;
grant execute on function public.upsert_category_budget(uuid, uuid, smallint, smallint, varchar, numeric), public.remove_category_budget(uuid, uuid), public.get_budget_consumption(uuid, smallint, smallint, text, varchar), public.get_monthly_budgets(uuid, smallint, smallint, text, varchar), public.get_budget_alerts(uuid, smallint, smallint, text) to authenticated;
