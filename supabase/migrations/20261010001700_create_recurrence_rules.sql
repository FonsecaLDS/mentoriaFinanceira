-- FIN-026: regras geradoras de transações previstas.

create table public.recurrence_rules (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  frequency text not null check (frequency in ('daily', 'weekly', 'monthly')),
  interval_count smallint not null default 1 check (interval_count between 1 and 365),
  start_date date not null,
  end_date date null,
  max_occurrences integer null check (max_occurrences is null or max_occurrences between 1 and 1000),
  generated_count integer not null default 0 check (generated_count >= 0),
  next_run_at date not null,
  day_of_month smallint not null check (day_of_month between 1 and 31),
  amount numeric(19,4) not null check (amount > 0 and amount = round(amount, 4)),
  currency varchar(3) not null check (currency ~ '^[A-Z]{3}$'),
  description text not null check (char_length(btrim(description)) between 1 and 200),
  category_id uuid null,
  person_id uuid null,
  cost_center_id uuid null,
  account_id uuid null,
  is_active boolean not null default true,
  cancelled_at timestamptz null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, category_id) references public.categories(tenant_id, id) on delete restrict,
  foreign key (tenant_id, person_id) references public.people(tenant_id, id) on delete restrict,
  foreign key (tenant_id, cost_center_id) references public.cost_centers(tenant_id, id) on delete restrict,
  foreign key (tenant_id, account_id) references public.accounts(tenant_id, id) on delete restrict,
  check (end_date is null or end_date >= start_date),
  check (next_run_at >= start_date),
  check ((cancelled_at is null) or not is_active)
);

alter table public.transactions
  add column recurrence_rule_id uuid null,
  add column recurrence_occurrence_date date null;

alter table public.transactions
  add constraint transactions_recurrence_fk
  foreign key (tenant_id, recurrence_rule_id)
  references public.recurrence_rules(tenant_id, id) on delete restrict;

create unique index transactions_recurrence_occurrence_idx
  on public.transactions (tenant_id, recurrence_rule_id, recurrence_occurrence_date)
  where recurrence_rule_id is not null and recurrence_occurrence_date is not null;

create index recurrence_rules_due_idx
  on public.recurrence_rules (tenant_id, next_run_at)
  where is_active = true and cancelled_at is null;

create or replace function public.normalize_recurrence_values()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  new.description = btrim(new.description);
  new.currency = upper(btrim(new.currency));
  new.next_run_at = new.start_date;
  new.day_of_month = extract(day from new.start_date)::smallint;
  return new;
end;
$$;

create or replace function public.validate_recurrence_references()
returns trigger language plpgsql set search_path = public, pg_temp as $$
declare category_type text; account_currency text;
begin
  if new.category_id is not null then
    select type into category_type from public.categories where tenant_id = new.tenant_id and id = new.category_id;
    if category_type is null or category_type <> new.type then raise exception 'recurrence category type must match transaction type'; end if;
  end if;
  if new.account_id is not null then
    select currency into account_currency from public.accounts where tenant_id = new.tenant_id and id = new.account_id;
    if account_currency is null or account_currency <> new.currency then raise exception 'recurrence currency must match account'; end if;
  end if;
  return new;
end;
$$;

create trigger recurrence_normalize_values before insert on public.recurrence_rules
for each row execute function public.normalize_recurrence_values();
create trigger recurrence_validate_references before insert or update on public.recurrence_rules
for each row execute function public.validate_recurrence_references();
create trigger recurrence_set_updated_at before update on public.recurrence_rules
for each row execute function public.set_updated_at();

create or replace function public.audit_recurrence_changes()
returns trigger language plpgsql security definer set search_path = public, auth, pg_temp as $$
begin
  perform public.write_audit_event(new.tenant_id, auth.uid(), case when tg_op = 'INSERT' then 'recurrence.created' else 'recurrence.updated' end, 'recurrence_rule', new.id, jsonb_build_object('frequency', new.frequency, 'next_run_at', new.next_run_at, 'is_active', new.is_active));
  return new;
end;
$$;

create trigger recurrence_audit_changes after insert or update on public.recurrence_rules
for each row execute function public.audit_recurrence_changes();

create or replace function public.advance_recurrence_date(
  p_date date, p_frequency text, p_interval smallint, p_day_of_month smallint
)
returns date language plpgsql immutable set search_path = public, pg_temp as $$
declare target_month date; last_day date;
begin
  if p_frequency = 'daily' then return p_date + p_interval;
  elsif p_frequency = 'weekly' then return p_date + (p_interval * 7);
  end if;
  target_month := (date_trunc('month', p_date)::date + make_interval(months => p_interval))::date;
  last_day := (date_trunc('month', target_month) + interval '1 month - 1 day')::date;
  return make_date(extract(year from target_month)::int, extract(month from target_month)::int, least(p_day_of_month, extract(day from last_day)::int));
end;
$$;

create or replace function public.create_recurrence_rule(
  p_tenant_id uuid, p_type text, p_frequency text, p_interval smallint,
  p_start_date date, p_end_date date, p_max_occurrences integer,
  p_amount numeric, p_currency text, p_description text,
  p_category_id uuid, p_person_id uuid, p_cost_center_id uuid, p_account_id uuid
)
returns public.recurrence_rules language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare result public.recurrence_rules;
begin
  if not public.has_tenant_role(p_tenant_id, array['owner', 'admin', 'editor']) then raise exception 'recurrence permission denied'; end if;
  if p_start_date is null or p_start_date < current_date - 3650 then raise exception 'invalid recurrence start date'; end if;
  if p_frequency not in ('daily', 'weekly', 'monthly') then raise exception 'invalid recurrence frequency'; end if;
  if p_interval is null or p_interval < 1 then raise exception 'invalid recurrence interval'; end if;
  if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount, 4) then raise exception 'invalid recurrence amount'; end if;
  insert into public.recurrence_rules (tenant_id, type, frequency, interval_count, start_date, end_date, max_occurrences, next_run_at, day_of_month, amount, currency, description, category_id, person_id, cost_center_id, account_id, created_by)
  values (p_tenant_id, p_type, p_frequency, p_interval, p_start_date, p_end_date, p_max_occurrences, p_start_date, extract(day from p_start_date)::smallint, p_amount, upper(btrim(p_currency)), p_description, p_category_id, p_person_id, p_cost_center_id, p_account_id, auth.uid())
  returning * into result;
  return result;
end;
$$;

create or replace function public.update_recurrence_rule(
  p_tenant_id uuid, p_rule_id uuid, p_type text, p_frequency text, p_interval smallint,
  p_start_date date, p_end_date date, p_max_occurrences integer,
  p_amount numeric, p_currency text, p_description text,
  p_category_id uuid, p_person_id uuid, p_cost_center_id uuid, p_account_id uuid
)
returns public.recurrence_rules language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare result public.recurrence_rules; existing public.recurrence_rules;
begin
  if not public.has_tenant_role(p_tenant_id, array['owner', 'admin', 'editor']) then raise exception 'recurrence permission denied'; end if;
  select * into existing from public.recurrence_rules where tenant_id = p_tenant_id and id = p_rule_id for update;
  if not found then raise exception 'recurrence not found'; end if;
  update public.recurrence_rules set type = p_type, frequency = p_frequency, interval_count = p_interval, start_date = p_start_date, next_run_at = case when generated_count = 0 then p_start_date else next_run_at end, day_of_month = case when generated_count = 0 then extract(day from p_start_date)::smallint else day_of_month end, end_date = p_end_date, max_occurrences = p_max_occurrences, amount = p_amount, currency = upper(btrim(p_currency)), description = p_description, category_id = p_category_id, person_id = p_person_id, cost_center_id = p_cost_center_id, account_id = p_account_id
  where tenant_id = p_tenant_id and id = p_rule_id returning * into result;
  return result;
end;
$$;

create or replace function public.set_recurrence_state(p_tenant_id uuid, p_rule_id uuid, p_action text)
returns public.recurrence_rules language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare result public.recurrence_rules;
begin
  if not public.has_tenant_role(p_tenant_id, array['owner', 'admin', 'editor']) then raise exception 'recurrence permission denied'; end if;
  if p_action not in ('pause', 'resume', 'cancel') then raise exception 'invalid recurrence action'; end if;
  update public.recurrence_rules set is_active = case when p_action = 'resume' then true else false end, cancelled_at = case when p_action = 'cancel' then now() else cancelled_at end
  where tenant_id = p_tenant_id and id = p_rule_id and (p_action <> 'resume' or cancelled_at is null)
  returning * into result;
  if not found then raise exception 'recurrence not found or cannot be resumed'; end if;
  return result;
end;
$$;

create or replace function public.generate_due_occurrences(p_tenant_id uuid, p_until_date date default current_date, p_limit integer default 100)
returns integer language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare rule_row public.recurrence_rules; occurrence_id uuid; generated integer := 0; next_date date;
begin
  if not public.has_tenant_role(p_tenant_id, array['owner', 'admin', 'editor']) then raise exception 'recurrence permission denied'; end if;
  if p_limit is null or p_limit < 1 or p_limit > 1000 then raise exception 'invalid generation limit'; end if;
  for rule_row in select * from public.recurrence_rules where tenant_id = p_tenant_id and is_active and cancelled_at is null and next_run_at <= p_until_date order by next_run_at, id for update skip locked loop
    while rule_row.next_run_at <= p_until_date and (rule_row.max_occurrences is null or rule_row.generated_count < rule_row.max_occurrences) and generated < p_limit loop
      if rule_row.end_date is null or rule_row.next_run_at <= rule_row.end_date then
        if not exists (select 1 from public.transactions where tenant_id = rule_row.tenant_id and recurrence_rule_id = rule_row.id and recurrence_occurrence_date = rule_row.next_run_at) then
          insert into public.transactions (tenant_id, type, description, amount, currency, category_id, person_id, cost_center_id, account_id, competence_date, due_date, status, created_by, recurrence_rule_id, recurrence_occurrence_date)
          values (rule_row.tenant_id, rule_row.type, rule_row.description, rule_row.amount, rule_row.currency, rule_row.category_id, rule_row.person_id, rule_row.cost_center_id, rule_row.account_id, rule_row.next_run_at, rule_row.next_run_at, 'planned', auth.uid(), rule_row.id, rule_row.next_run_at)
          returning id into occurrence_id;
        end if;
        if occurrence_id is not null then generated := generated + 1; end if;
      end if;
      next_date := public.advance_recurrence_date(rule_row.next_run_at, rule_row.frequency, rule_row.interval_count, rule_row.day_of_month);
      update public.recurrence_rules set next_run_at = next_date, generated_count = generated_count + case when occurrence_id is null then 0 else 1 end, is_active = case when end_date is not null and next_date > end_date then false when max_occurrences is not null and generated_count + case when occurrence_id is null then 0 else 1 end >= max_occurrences then false else is_active end where id = rule_row.id;
      rule_row.next_run_at := next_date;
      rule_row.generated_count := rule_row.generated_count + case when occurrence_id is null then 0 else 1 end;
      occurrence_id := null;
    end loop;
    if generated >= p_limit then exit; end if;
  end loop;
  return generated;
end;
$$;

alter table public.recurrence_rules enable row level security;
create policy recurrence_select_members on public.recurrence_rules for select to authenticated using (public.is_active_tenant_member(tenant_id));
revoke all on table public.recurrence_rules from public, anon, authenticated;
grant select on table public.recurrence_rules to authenticated;
revoke all on function public.audit_recurrence_changes(), public.create_recurrence_rule(uuid,text,text,smallint,date,date,integer,numeric,text,text,uuid,uuid,uuid,uuid), public.update_recurrence_rule(uuid,uuid,text,text,smallint,date,date,integer,numeric,text,text,uuid,uuid,uuid,uuid), public.set_recurrence_state(uuid,uuid,text), public.generate_due_occurrences(uuid,date,integer) from public, anon, authenticated;
grant execute on function public.create_recurrence_rule(uuid,text,text,smallint,date,date,integer,numeric,text,text,uuid,uuid,uuid,uuid), public.update_recurrence_rule(uuid,uuid,text,text,smallint,date,date,integer,numeric,text,text,uuid,uuid,uuid,uuid), public.set_recurrence_state(uuid,uuid,text), public.generate_due_occurrences(uuid,date,integer) to authenticated;
