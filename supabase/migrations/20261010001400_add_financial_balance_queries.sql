-- FIN-023: saldos e indicadores derivados do livro efetivo.

create or replace function public.require_balance_access(p_tenant_id uuid)
returns void
language plpgsql security definer
set search_path = public, auth, pg_temp
as $$
begin
  if auth.uid() is null or not public.is_active_tenant_member(p_tenant_id) then
    raise exception 'financial balance permission denied' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.get_account_balance(
  p_account_id uuid,
  p_as_of timestamptz default now()
)
returns table (
  account_id uuid,
  tenant_id uuid,
  currency varchar(3),
  opening_balance numeric(19,4),
  movement_total numeric(19,4),
  balance numeric(19,4)
)
language plpgsql security invoker
set search_path = public, auth, pg_temp
as $$
declare account_row public.accounts;
begin
  if p_as_of is null or p_as_of > now() then raise exception 'balance date cannot be in the future'; end if;
  select * into account_row from public.accounts where id = p_account_id;
  if not found then raise exception 'account not found'; end if;
  perform public.require_balance_access(account_row.tenant_id);
  return query
  select account_row.id, account_row.tenant_id, account_row.currency,
    account_row.opening_balance,
    coalesce((select sum(m.amount) from public.account_movements m
      where m.tenant_id = account_row.tenant_id and m.account_id = account_row.id
        and m.effective_at::date >= account_row.opening_date and m.effective_at <= p_as_of), 0)::numeric(19,4),
    (account_row.opening_balance + coalesce((select sum(m.amount) from public.account_movements m
      where m.tenant_id = account_row.tenant_id and m.account_id = account_row.id
        and m.effective_at::date >= account_row.opening_date and m.effective_at <= p_as_of), 0))::numeric(19,4);
end;
$$;

create or replace function public.get_account_balances(
  p_tenant_id uuid,
  p_as_of timestamptz default now()
)
returns table (
  account_id uuid,
  tenant_id uuid,
  account_name text,
  account_type text,
  currency varchar(3),
  opening_balance numeric(19,4),
  movement_total numeric(19,4),
  balance numeric(19,4),
  is_restricted boolean
)
language plpgsql security invoker
set search_path = public, auth, pg_temp
as $$
begin
  if p_as_of is null or p_as_of > now() then raise exception 'balance date cannot be in the future'; end if;
  perform public.require_balance_access(p_tenant_id);
  return query
  select a.id, a.tenant_id, a.name, a.type, a.currency, a.opening_balance,
    coalesce(sum(m.amount) filter (where m.effective_at::date >= a.opening_date and m.effective_at <= p_as_of), 0)::numeric(19,4),
    (a.opening_balance + coalesce(sum(m.amount) filter (where m.effective_at::date >= a.opening_date and m.effective_at <= p_as_of), 0))::numeric(19,4),
    (a.type = 'benefit')
  from public.accounts a
  left join public.account_movements m on m.tenant_id = a.tenant_id and m.account_id = a.id
  where a.tenant_id = p_tenant_id
  group by a.id, a.tenant_id, a.name, a.type, a.currency, a.opening_balance, a.opening_date
  order by a.name;
end;
$$;

create or replace function public.get_cash_result(
  p_tenant_id uuid,
  p_from date,
  p_to date,
  p_currency varchar(3) default null
)
returns table (currency varchar(3), income numeric(19,4), expense numeric(19,4), result numeric(19,4))
language plpgsql security invoker
set search_path = public, auth, pg_temp
as $$
begin
  if p_from is null or p_to is null or p_from > p_to then raise exception 'invalid financial period'; end if;
  perform public.require_balance_access(p_tenant_id);
  return query
  select t.currency,
    coalesce(sum(s.amount) filter (where t.type = 'income'), 0)::numeric(19,4),
    coalesce(sum(s.amount) filter (where t.type = 'expense'), 0)::numeric(19,4),
    (coalesce(sum(s.amount) filter (where t.type = 'income'), 0) - coalesce(sum(s.amount) filter (where t.type = 'expense'), 0))::numeric(19,4)
  from public.transaction_settlements s
  join public.transactions t on t.tenant_id = s.tenant_id and t.id = s.transaction_id
  where s.tenant_id = p_tenant_id and s.reversed_at is null
    and s.settled_at::date between p_from and p_to
    and (p_currency is null or t.currency = p_currency)
  group by t.currency order by t.currency;
end;
$$;

create or replace function public.get_accrual_result(
  p_tenant_id uuid,
  p_from date,
  p_to date,
  p_currency varchar(3) default null
)
returns table (currency varchar(3), income numeric(19,4), expense numeric(19,4), result numeric(19,4))
language plpgsql security invoker
set search_path = public, auth, pg_temp
as $$
begin
  if p_from is null or p_to is null or p_from > p_to then raise exception 'invalid financial period'; end if;
  perform public.require_balance_access(p_tenant_id);
  return query
  select t.currency,
    coalesce(sum(t.amount) filter (where t.type = 'income'), 0)::numeric(19,4),
    coalesce(sum(t.amount) filter (where t.type = 'expense'), 0)::numeric(19,4),
    (coalesce(sum(t.amount) filter (where t.type = 'income'), 0) - coalesce(sum(t.amount) filter (where t.type = 'expense'), 0))::numeric(19,4)
  from public.transactions t
  where t.tenant_id = p_tenant_id and t.status <> 'cancelled'
    and t.competence_date between p_from and p_to
    and (p_currency is null or t.currency = p_currency)
  group by t.currency order by t.currency;
end;
$$;

create or replace function public.get_projected_balance(
  p_account_id uuid,
  p_as_of timestamptz default now()
)
returns table (account_id uuid, tenant_id uuid, currency varchar(3), current_balance numeric(19,4), expected_inflows numeric(19,4), expected_outflows numeric(19,4), projected_balance numeric(19,4))
language plpgsql security invoker
set search_path = public, auth, pg_temp
as $$
declare account_row public.accounts; current_amount numeric(19,4); inflows numeric(19,4); outflows numeric(19,4);
begin
  if p_as_of is null or p_as_of > now() then raise exception 'balance date cannot be in the future'; end if;
  select * into account_row from public.accounts where id = p_account_id;
  if not found then raise exception 'account not found'; end if;
  perform public.require_balance_access(account_row.tenant_id);
  select b.balance into current_amount from public.get_account_balance(p_account_id, p_as_of) b;
  select coalesce(sum(remaining) filter (where t.type = 'income'), 0), coalesce(sum(remaining) filter (where t.type = 'expense'), 0)
    into inflows, outflows
  from public.transactions t
  left join lateral (select t.amount - coalesce(sum(s.amount) filter (where s.reversed_at is null), 0) as remaining
    from public.transaction_settlements s where s.tenant_id = t.tenant_id and s.transaction_id = t.id) settled on true
  where t.tenant_id = account_row.tenant_id and t.account_id = account_row.id
    and t.status in ('planned', 'pending', 'partially_paid') and t.due_date >= p_as_of::date
    and t.currency = account_row.currency and settled.remaining > 0;
  return query select account_row.id, account_row.tenant_id, account_row.currency, current_amount, inflows, outflows, current_amount + inflows - outflows;
end;
$$;

create or replace function public.get_financial_summary(
  p_tenant_id uuid,
  p_from date,
  p_to date,
  p_as_of timestamptz default now()
)
returns table (
  currency varchar(3),
  cash_income numeric(19,4), cash_expense numeric(19,4), cash_result numeric(19,4),
  accrual_income numeric(19,4), accrual_expense numeric(19,4), accrual_result numeric(19,4),
  current_balance numeric(19,4), projected_balance numeric(19,4),
  restricted_balance numeric(19,4), available_balance numeric(19,4),
  receivables numeric(19,4), payables numeric(19,4)
)
language plpgsql security invoker
set search_path = public, auth, pg_temp
as $$
begin
  if p_from is null or p_to is null or p_from > p_to then raise exception 'invalid financial period'; end if;
  perform public.require_balance_access(p_tenant_id);
  return query
  with currencies as (
    select a.currency from public.accounts a where a.tenant_id = p_tenant_id
    union select t.currency from public.transactions t where t.tenant_id = p_tenant_id
  ), balances as (
    select b.currency, sum(b.balance) as current_balance,
      sum(b.balance) filter (where b.is_restricted) as restricted_balance,
      sum(b.balance) filter (where not b.is_restricted) as available_balance
    from public.get_account_balances(p_tenant_id, p_as_of) b group by b.currency
  ), cash as (
    select * from public.get_cash_result(p_tenant_id, p_from, p_to)
  ), accrual as (
    select * from public.get_accrual_result(p_tenant_id, p_from, p_to)
  ), projected as (
    select p.currency, sum(p.projected_balance) projected_balance from public.accounts a
    cross join lateral public.get_projected_balance(a.id, p_as_of) p
    where a.tenant_id = p_tenant_id group by p.currency
  ), due as (
    select t.currency, sum(t.amount - coalesce((select sum(s.amount) from public.transaction_settlements s where s.tenant_id = t.tenant_id and s.transaction_id = t.id and s.reversed_at is null), 0)) filter (where t.type = 'income') receivables,
      sum(t.amount - coalesce((select sum(s.amount) from public.transaction_settlements s where s.tenant_id = t.tenant_id and s.transaction_id = t.id and s.reversed_at is null), 0)) filter (where t.type = 'expense') payables
    from public.transactions t where t.tenant_id = p_tenant_id and t.status in ('planned', 'pending', 'partially_paid') group by t.currency
  )
  select c.currency, coalesce(cash.income, 0), coalesce(cash.expense, 0), coalesce(cash.result, 0),
    coalesce(accrual.income, 0), coalesce(accrual.expense, 0), coalesce(accrual.result, 0),
    coalesce(b.current_balance, 0), coalesce(projected.projected_balance, b.current_balance, 0),
    coalesce(b.restricted_balance, 0), coalesce(b.available_balance, 0), coalesce(due.receivables, 0), coalesce(due.payables, 0)
  from currencies c left join balances b using (currency) left join cash using (currency) left join accrual using (currency) left join projected using (currency) left join due using (currency)
  order by c.currency;
end;
$$;

revoke all on function public.require_balance_access(uuid), public.get_account_balance(uuid, timestamptz), public.get_account_balances(uuid, timestamptz), public.get_cash_result(uuid, date, date, varchar), public.get_accrual_result(uuid, date, date, varchar), public.get_projected_balance(uuid, timestamptz), public.get_financial_summary(uuid, date, date, timestamptz) from public, anon, authenticated;
grant execute on function public.require_balance_access(uuid) to authenticated;
grant execute on function public.get_account_balance(uuid, timestamptz), public.get_account_balances(uuid, timestamptz), public.get_cash_result(uuid, date, date, varchar), public.get_accrual_result(uuid, date, date, varchar), public.get_projected_balance(uuid, timestamptz), public.get_financial_summary(uuid, date, date, timestamptz) to authenticated;
