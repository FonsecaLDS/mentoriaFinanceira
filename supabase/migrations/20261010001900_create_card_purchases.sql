-- FIN-028: compras no cartão e parcelas previstas.

create table public.invoice_cycles (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  card_id uuid not null,
  cycle_start date not null,
  cycle_end date not null,
  due_date date not null,
  status text not null default 'planned' check (status in ('planned', 'open', 'closed', 'paid')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, card_id, cycle_start),
  foreign key (tenant_id, card_id) references public.credit_cards(tenant_id, id) on delete restrict,
  check (cycle_end >= cycle_start),
  check (due_date >= cycle_end)
);

create table public.card_purchases (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  card_id uuid not null,
  description text not null check (char_length(btrim(description)) between 1 and 200),
  purchased_at date not null,
  total_amount numeric(19,4) not null check (total_amount > 0 and total_amount = round(total_amount, 4)),
  currency varchar(3) not null check (currency ~ '^[A-Z]{3}$'),
  installments_count integer not null check (installments_count between 1 and 120),
  category_id uuid null,
  person_id uuid null,
  cost_center_id uuid null,
  idempotency_key text not null check (char_length(idempotency_key) between 16 and 200),
  status text not null default 'active' check (status in ('active', 'cancelled')),
  cancelled_at timestamptz null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, idempotency_key),
  foreign key (tenant_id, card_id) references public.credit_cards(tenant_id, id) on delete restrict,
  foreign key (tenant_id, category_id) references public.categories(tenant_id, id) on delete restrict,
  foreign key (tenant_id, person_id) references public.people(tenant_id, id) on delete restrict,
  foreign key (tenant_id, cost_center_id) references public.cost_centers(tenant_id, id) on delete restrict,
  check ((status = 'cancelled' and cancelled_at is not null) or (status = 'active' and cancelled_at is null))
);

create table public.card_installments (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  purchase_id uuid not null,
  card_id uuid not null,
  transaction_id uuid not null,
  invoice_cycle_id uuid not null,
  installment_number integer not null,
  total_installments integer not null,
  amount numeric(19,4) not null check (amount > 0 and amount = round(amount, 4)),
  currency varchar(3) not null check (currency ~ '^[A-Z]{3}$'),
  competence_date date not null,
  status text not null default 'planned' check (status in ('planned', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, purchase_id, installment_number),
  foreign key (tenant_id, purchase_id) references public.card_purchases(tenant_id, id) on delete restrict,
  foreign key (tenant_id, card_id) references public.credit_cards(tenant_id, id) on delete restrict,
  foreign key (tenant_id, transaction_id) references public.transactions(tenant_id, id) on delete restrict,
  foreign key (tenant_id, invoice_cycle_id) references public.invoice_cycles(tenant_id, id) on delete restrict,
  check (installment_number between 1 and total_installments),
  check (total_installments between 1 and 120)
);

create index invoice_cycles_card_end_idx on public.invoice_cycles (tenant_id, card_id, cycle_end);
create index card_purchases_card_date_idx on public.card_purchases (tenant_id, card_id, purchased_at desc);
create index card_installments_cycle_idx on public.card_installments (tenant_id, invoice_cycle_id, competence_date);
create index card_installments_transaction_idx on public.card_installments (tenant_id, transaction_id);

create trigger invoice_cycles_set_updated_at before update on public.invoice_cycles for each row execute function public.set_updated_at();
create trigger card_purchases_set_updated_at before update on public.card_purchases for each row execute function public.set_updated_at();
create trigger card_installments_set_updated_at before update on public.card_installments for each row execute function public.set_updated_at();

create or replace function public.card_month_last_day(p_date date)
returns date language sql immutable set search_path = public, pg_temp as $$
  select (date_trunc('month', p_date) + interval '1 month - 1 day')::date
$$;

create or replace function public.card_closing_date(p_year integer, p_month integer, p_day integer)
returns date language sql immutable set search_path = public, pg_temp as $$
  select make_date(p_year, p_month, least(p_day, extract(day from public.card_month_last_day(make_date(p_year, p_month, 1)))::int))
$$;

create or replace function public.card_cycle_end(p_purchase_date date, p_closing_day integer)
returns date language plpgsql immutable set search_path = public, pg_temp as $$
declare current_end date;
begin
  current_end := public.card_closing_date(extract(year from p_purchase_date)::int, extract(month from p_purchase_date)::int, p_closing_day);
  if p_purchase_date <= current_end then return current_end; end if;
  return public.card_closing_date(extract(year from (p_purchase_date + interval '1 month'))::int, extract(month from (p_purchase_date + interval '1 month'))::int, p_closing_day);
end;
$$;

create or replace function public.card_cycle_due_date(p_cycle_end date, p_due_day integer, p_closing_day integer)
returns date language sql immutable set search_path = public, pg_temp as $$
  select public.card_closing_date(extract(year from (p_cycle_end + case when p_due_day <= p_closing_day then interval '1 month' else interval '0 day' end))::int, extract(month from (p_cycle_end + case when p_due_day <= p_closing_day then interval '1 month' else interval '0 day' end))::int, p_due_day)
$$;

create or replace function public.get_or_create_invoice_cycle(p_tenant_id uuid, p_card_id uuid, p_cycle_end date, p_due_day integer, p_closing_day integer)
returns public.invoice_cycles language plpgsql security definer set search_path = public, pg_temp as $$
declare result public.invoice_cycles; previous_end date; v_cycle_start date;
begin
  previous_end := public.card_closing_date(extract(year from (p_cycle_end - interval '1 month'))::int, extract(month from (p_cycle_end - interval '1 month'))::int, p_closing_day);
  v_cycle_start := previous_end + 1;
  insert into public.invoice_cycles (tenant_id, card_id, cycle_start, cycle_end, due_date)
  values (p_tenant_id, p_card_id, v_cycle_start, p_cycle_end, public.card_cycle_due_date(p_cycle_end, p_due_day, p_closing_day))
  on conflict (tenant_id, card_id, cycle_start) do update set due_date = excluded.due_date
  returning * into result;
  return result;
end;
$$;

create or replace function public.audit_card_purchase_changes()
returns trigger language plpgsql security definer set search_path = public, auth, pg_temp as $$
begin
  perform public.write_audit_event(new.tenant_id, auth.uid(), case when tg_op = 'INSERT' then 'card_purchase.created' else 'card_purchase.updated' end, 'card_purchase', new.id, jsonb_build_object('total_amount', new.total_amount, 'currency', new.currency, 'installments_count', new.installments_count, 'status', new.status));
  return new;
end;
$$;
create trigger card_purchases_audit_changes after insert or update on public.card_purchases for each row execute function public.audit_card_purchase_changes();

create or replace function public.create_card_purchase(
  p_tenant_id uuid, p_card_id uuid, p_description text, p_purchased_at date,
  p_total_amount numeric, p_currency text, p_installments_count integer,
  p_category_id uuid, p_person_id uuid, p_cost_center_id uuid, p_idempotency_key text
)
returns public.card_purchases language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare
  card public.credit_cards; existing public.card_purchases; purchase public.card_purchases;
  cycle public.invoice_cycles; installment_amount numeric(19,4); base_amount numeric(19,4); remainder_units integer;
  cycle_end date; cycle_date date; previous_end date; transaction_row public.transactions; suffix text;
  i integer;
begin
  if not public.has_tenant_role(p_tenant_id, array['owner', 'admin', 'editor']) then raise exception 'card purchase permission denied'; end if;
  if p_idempotency_key is null or char_length(p_idempotency_key) not between 16 and 200 then raise exception 'invalid idempotency key'; end if;
  select * into existing from public.card_purchases where tenant_id = p_tenant_id and idempotency_key = p_idempotency_key for update;
  if existing.id is not null then
    if existing.card_id <> p_card_id or existing.total_amount <> p_total_amount or existing.installments_count <> p_installments_count then raise exception 'idempotency key payload mismatch'; end if;
    return existing;
  end if;
  select * into card from public.credit_cards where tenant_id = p_tenant_id and id = p_card_id for update;
  if not found or not card.is_active then raise exception 'active credit card is required'; end if;
  if p_total_amount is null or p_total_amount <= 0 or p_total_amount <> round(p_total_amount, 4) then raise exception 'invalid purchase amount'; end if;
  if p_installments_count is null or p_installments_count not between 1 and 120 or p_total_amount < p_installments_count / 10000.0 then raise exception 'purchase amount is too small for installments'; end if;
  if p_currency is null or upper(btrim(p_currency)) <> card.currency then raise exception 'purchase currency must match card'; end if;
  if p_purchased_at is null then raise exception 'purchase date is required'; end if;
  base_amount := trunc(p_total_amount / p_installments_count, 4);
  remainder_units := round((p_total_amount - (base_amount * p_installments_count)) * 10000)::integer;
  insert into public.card_purchases (tenant_id, card_id, description, purchased_at, total_amount, currency, installments_count, category_id, person_id, cost_center_id, idempotency_key, created_by)
  values (p_tenant_id, p_card_id, p_description, p_purchased_at, p_total_amount, upper(btrim(p_currency)), p_installments_count, p_category_id, p_person_id, p_cost_center_id, p_idempotency_key, auth.uid())
  on conflict (tenant_id, idempotency_key) do nothing returning * into purchase;
  if purchase.id is null then
    select * into purchase from public.card_purchases where tenant_id = p_tenant_id and idempotency_key = p_idempotency_key for update;
    if purchase.card_id <> p_card_id or purchase.total_amount <> p_total_amount or purchase.installments_count <> p_installments_count then raise exception 'idempotency key payload mismatch'; end if;
    return purchase;
  end if;
  cycle_end := public.card_cycle_end(p_purchased_at, card.closing_day);
  for i in 1..p_installments_count loop
    if i > 1 then cycle_end := public.card_closing_date(extract(year from (cycle_end + interval '1 month'))::int, extract(month from (cycle_end + interval '1 month'))::int, card.closing_day); end if;
    previous_end := public.card_closing_date(extract(year from (cycle_end - interval '1 month'))::int, extract(month from (cycle_end - interval '1 month'))::int, card.closing_day);
    cycle := public.get_or_create_invoice_cycle(p_tenant_id, card.id, cycle_end, card.due_day, card.closing_day);
    installment_amount := base_amount + case when i <= remainder_units then 0.0001 else 0 end;
    suffix := ' (' || i || '/' || p_installments_count || ')';
    insert into public.transactions (tenant_id, type, description, amount, currency, category_id, person_id, cost_center_id, account_id, competence_date, due_date, status, created_by)
    values (p_tenant_id, 'expense', left(btrim(p_description), 200 - char_length(suffix)) || suffix, installment_amount, card.currency, p_category_id, p_person_id, p_cost_center_id, null, cycle_end, cycle.due_date, 'planned', auth.uid()) returning * into transaction_row;
    insert into public.card_installments (tenant_id, purchase_id, card_id, transaction_id, invoice_cycle_id, installment_number, total_installments, amount, currency, competence_date)
    values (p_tenant_id, purchase.id, card.id, transaction_row.id, cycle.id, i, p_installments_count, installment_amount, card.currency, cycle_end);
  end loop;
  return purchase;
end;
$$;

create or replace function public.cancel_card_purchase(p_tenant_id uuid, p_purchase_id uuid)
returns public.card_purchases language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare purchase public.card_purchases; result public.card_purchases;
begin
  if not public.has_tenant_role(p_tenant_id, array['owner', 'admin', 'editor']) then raise exception 'card purchase permission denied'; end if;
  select * into purchase from public.card_purchases where tenant_id = p_tenant_id and id = p_purchase_id for update;
  if not found then raise exception 'card purchase not found'; end if;
  if purchase.status = 'cancelled' then return purchase; end if;
  if exists (select 1 from public.card_installments i join public.transaction_settlements s on s.tenant_id = i.tenant_id and s.transaction_id = i.transaction_id where i.tenant_id = p_tenant_id and i.purchase_id = p_purchase_id and s.reversed_at is null) then raise exception 'settled card purchase cannot be cancelled'; end if;
  update public.card_purchases set status = 'cancelled', cancelled_at = now() where tenant_id = p_tenant_id and id = p_purchase_id returning * into result;
  update public.card_installments set status = 'cancelled' where tenant_id = p_tenant_id and purchase_id = p_purchase_id;
  update public.transactions set status = 'cancelled' where id in (select transaction_id from public.card_installments where tenant_id = p_tenant_id and purchase_id = p_purchase_id) and status <> 'cancelled';
  return result;
end;
$$;

alter table public.invoice_cycles enable row level security;
alter table public.card_purchases enable row level security;
alter table public.card_installments enable row level security;
create policy invoice_cycles_select_members on public.invoice_cycles for select to authenticated using (public.is_active_tenant_member(tenant_id));
create policy card_purchases_select_members on public.card_purchases for select to authenticated using (public.is_active_tenant_member(tenant_id));
create policy card_installments_select_members on public.card_installments for select to authenticated using (public.is_active_tenant_member(tenant_id));
revoke all on table public.invoice_cycles, public.card_purchases, public.card_installments from public, anon, authenticated;
grant select on table public.invoice_cycles, public.card_purchases, public.card_installments to authenticated;
revoke all on function public.card_month_last_day(date), public.card_closing_date(integer,integer,integer), public.card_cycle_end(date,integer), public.card_cycle_due_date(date,integer,integer), public.get_or_create_invoice_cycle(uuid,uuid,date,integer,integer), public.audit_card_purchase_changes(), public.create_card_purchase(uuid,uuid,text,date,numeric, text,integer,uuid,uuid,uuid,text), public.cancel_card_purchase(uuid,uuid) from public, anon, authenticated;
grant execute on function public.create_card_purchase(uuid,uuid,text,date,numeric,text,integer,uuid,uuid,uuid,text), public.cancel_card_purchase(uuid,uuid) to authenticated;
