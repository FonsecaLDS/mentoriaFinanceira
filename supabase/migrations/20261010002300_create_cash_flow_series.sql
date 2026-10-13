create or replace function public.get_cash_flow_series(
  p_tenant_id uuid,
  p_from date,
  p_to date,
  p_account_id uuid default null,
  p_currency varchar default null,
  p_regime text default 'cash',
  p_granularity text default 'month'
)
returns table (
  period_start date,
  currency varchar,
  income numeric,
  expense numeric,
  result numeric,
  cumulative_result numeric
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if not public.is_active_tenant_member(p_tenant_id) then
    raise exception 'dashboard access denied';
  end if;
  if p_from is null or p_to is null or p_from > p_to then
    raise exception 'invalid cash flow period';
  end if;
  if p_regime not in ('cash', 'competence') then
    raise exception 'invalid cash flow regime';
  end if;
  if p_granularity not in ('day', 'week', 'month') then
    raise exception 'invalid cash flow granularity';
  end if;
  if p_currency is not null and p_currency !~ '^[A-Z]{3}$' then
    raise exception 'invalid cash flow currency';
  end if;
  if p_account_id is not null and not exists (
    select 1 from public.accounts a where a.tenant_id = p_tenant_id and a.id = p_account_id
  ) then
    raise exception 'cash flow account not found';
  end if;

  return query
  with bounds as (
    select date_trunc(p_granularity, p_from::timestamp)::date as first_period,
           date_trunc(p_granularity, p_to::timestamp)::date as last_period
  ),
  currencies as (
    select distinct x.currency
    from (
      select t.currency
      from public.transactions t
      where p_regime = 'competence' and t.tenant_id = p_tenant_id
        and t.competence_date between p_from and p_to and t.status <> 'cancelled'
        and (p_account_id is null or t.account_id = p_account_id)
        and (p_currency is null or t.currency = p_currency)
      union
      select t.currency
      from public.transaction_settlements s
      join public.transactions t on t.tenant_id = s.tenant_id and t.id = s.transaction_id
      where p_regime = 'cash' and s.tenant_id = p_tenant_id
        and s.settled_at::date between p_from and p_to and s.reversed_at is null
        and (p_account_id is null or s.account_id = p_account_id)
        and (p_currency is null or t.currency = p_currency)
    ) x
  ),
  periods as (
    select generate_series(b.first_period, b.last_period, ('1 ' || p_granularity)::interval)::date as period_start
    from bounds b
  ),
  grid as (
    select p.period_start, c.currency
    from periods p cross join currencies c
  ),
  values_by_period as (
    select date_trunc(p_granularity, t.competence_date::timestamp)::date as period_start,
           t.currency,
           sum(case when t.type = 'income' then t.amount else 0 end)::numeric(19,4) as income,
           sum(case when t.type = 'expense' then t.amount else 0 end)::numeric(19,4) as expense
    from public.transactions t
    where p_regime = 'competence' and t.tenant_id = p_tenant_id
      and t.competence_date between p_from and p_to and t.status <> 'cancelled'
      and (p_account_id is null or t.account_id = p_account_id)
      and (p_currency is null or t.currency = p_currency)
    group by 1, 2
    union all
    select date_trunc(p_granularity, s.settled_at)::date,
           t.currency,
           sum(case when t.type = 'income' then s.amount else 0 end)::numeric(19,4),
           sum(case when t.type = 'expense' then s.amount else 0 end)::numeric(19,4)
    from public.transaction_settlements s
    join public.transactions t on t.tenant_id = s.tenant_id and t.id = s.transaction_id
    where p_regime = 'cash' and s.tenant_id = p_tenant_id
      and s.settled_at::date between p_from and p_to and s.reversed_at is null
      and (p_account_id is null or s.account_id = p_account_id)
      and (p_currency is null or t.currency = p_currency)
    group by 1, 2
  ),
  filled as (
    select g.period_start, g.currency,
           coalesce(sum(v.income), 0)::numeric(19,4) as income,
           coalesce(sum(v.expense), 0)::numeric(19,4) as expense
    from grid g left join values_by_period v on v.period_start = g.period_start and v.currency = g.currency
    group by g.period_start, g.currency
  )
  select f.period_start, f.currency, f.income, f.expense,
         (f.income - f.expense)::numeric(19,4) as result,
         sum(f.income - f.expense) over (partition by f.currency order by f.period_start rows between unbounded preceding and current row)::numeric(19,4) as cumulative_result
  from filled f
  order by f.currency, f.period_start;
end;
$$;

revoke all on function public.get_cash_flow_series(uuid, date, date, uuid, varchar, text, text) from public, anon, authenticated;
grant execute on function public.get_cash_flow_series(uuid, date, date, uuid, varchar, text, text) to authenticated;
