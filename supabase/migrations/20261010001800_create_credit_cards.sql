-- FIN-027: cadastro de instrumentos de crédito sem dados sensíveis.

create table public.credit_cards (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  name_normalized text not null,
  institution_name text null check (institution_name is null or char_length(btrim(institution_name)) <= 120),
  credit_limit numeric(19,4) not null check (credit_limit >= 0 and credit_limit = round(credit_limit, 4)),
  currency varchar(3) not null check (currency ~ '^[A-Z]{3}$'),
  closing_day integer not null check (closing_day between 1 and 31),
  due_day integer not null check (due_day between 1 and 31),
  payment_account_id uuid null,
  is_active boolean not null default true,
  archived_at timestamptz null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, payment_account_id) references public.accounts(tenant_id, id) on delete restrict,
  check ((is_active and archived_at is null) or (not is_active))
);

create unique index credit_cards_tenant_name_idx on public.credit_cards (tenant_id, name_normalized);
create index credit_cards_tenant_active_idx on public.credit_cards (tenant_id, is_active, name);
create index credit_cards_payment_account_idx on public.credit_cards (tenant_id, payment_account_id);

create or replace function public.normalize_credit_card_values()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  new.name = btrim(new.name);
  new.name_normalized = lower(btrim(new.name));
  new.currency = upper(btrim(new.currency));
  if new.institution_name is not null then new.institution_name = nullif(btrim(new.institution_name), ''); end if;
  if new.is_active then new.archived_at = null; elsif new.archived_at is null then new.archived_at = now(); end if;
  return new;
end;
$$;

create or replace function public.validate_credit_card_payment_account()
returns trigger language plpgsql set search_path = public, pg_temp as $$
declare account_currency text; account_active boolean;
begin
  if new.payment_account_id is not null then
    select currency, is_active into account_currency, account_active from public.accounts where tenant_id = new.tenant_id and id = new.payment_account_id;
    if account_currency is null or not account_active then raise exception 'active payment account is required'; end if;
    if account_currency <> new.currency then raise exception 'payment account currency must match card'; end if;
  end if;
  return new;
end;
$$;

create trigger credit_cards_normalize_values before insert or update on public.credit_cards
for each row execute function public.normalize_credit_card_values();
create trigger credit_cards_validate_payment_account before insert or update on public.credit_cards
for each row execute function public.validate_credit_card_payment_account();
create trigger credit_cards_set_updated_at before update on public.credit_cards
for each row execute function public.set_updated_at();

create or replace function public.audit_credit_card_changes()
returns trigger language plpgsql security definer set search_path = public, auth, pg_temp as $$
begin
  perform public.write_audit_event(new.tenant_id, auth.uid(), case when tg_op = 'INSERT' then 'credit_card.created' else 'credit_card.updated' end, 'credit_card', new.id, jsonb_build_object('name', new.name, 'currency', new.currency, 'is_active', new.is_active));
  return new;
end;
$$;

create trigger credit_cards_audit_changes after insert or update on public.credit_cards
for each row execute function public.audit_credit_card_changes();

create or replace function public.create_credit_card(
  p_tenant_id uuid, p_name text, p_institution_name text, p_credit_limit numeric,
  p_currency text, p_closing_day integer, p_due_day integer, p_payment_account_id uuid
)
returns public.credit_cards language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare result public.credit_cards;
begin
  if not public.has_tenant_role(p_tenant_id, array['owner', 'admin', 'editor']) then raise exception 'credit card permission denied'; end if;
  insert into public.credit_cards (tenant_id, name, name_normalized, institution_name, credit_limit, currency, closing_day, due_day, payment_account_id, created_by)
  values (p_tenant_id, p_name, lower(btrim(p_name)), p_institution_name, p_credit_limit, upper(btrim(p_currency)), p_closing_day, p_due_day, p_payment_account_id, auth.uid())
  returning * into result;
  return result;
end;
$$;

create or replace function public.update_credit_card(
  p_tenant_id uuid, p_card_id uuid, p_name text, p_institution_name text, p_credit_limit numeric,
  p_currency text, p_closing_day integer, p_due_day integer, p_payment_account_id uuid
)
returns public.credit_cards language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare result public.credit_cards;
begin
  if not public.has_tenant_role(p_tenant_id, array['owner', 'admin', 'editor']) then raise exception 'credit card permission denied'; end if;
  update public.credit_cards set name = p_name, name_normalized = lower(btrim(p_name)), institution_name = p_institution_name, credit_limit = p_credit_limit, currency = upper(btrim(p_currency)), closing_day = p_closing_day, due_day = p_due_day, payment_account_id = p_payment_account_id
  where tenant_id = p_tenant_id and id = p_card_id returning * into result;
  if not found then raise exception 'credit card not found'; end if;
  return result;
end;
$$;

create or replace function public.set_credit_card_state(p_tenant_id uuid, p_card_id uuid, p_is_active boolean)
returns public.credit_cards language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare result public.credit_cards;
begin
  if not public.has_tenant_role(p_tenant_id, array['owner', 'admin', 'editor']) then raise exception 'credit card permission denied'; end if;
  update public.credit_cards set is_active = p_is_active, archived_at = case when p_is_active then null else coalesce(archived_at, now()) end
  where tenant_id = p_tenant_id and id = p_card_id returning * into result;
  if not found then raise exception 'credit card not found'; end if;
  return result;
end;
$$;

alter table public.credit_cards enable row level security;
create policy credit_cards_select_members on public.credit_cards for select to authenticated using (public.is_active_tenant_member(tenant_id));
revoke all on table public.credit_cards from public, anon, authenticated;
grant select on table public.credit_cards to authenticated;
revoke all on function public.normalize_credit_card_values(), public.validate_credit_card_payment_account(), public.audit_credit_card_changes(), public.create_credit_card(uuid,text,text,numeric,text,integer,integer,uuid), public.update_credit_card(uuid,uuid,text,text,numeric,text,integer,integer,uuid), public.set_credit_card_state(uuid,uuid,boolean) from public, anon, authenticated;
grant execute on function public.create_credit_card(uuid,text,text,numeric,text,integer,integer,uuid), public.update_credit_card(uuid,uuid,text,text,numeric,text,integer,integer,uuid), public.set_credit_card_state(uuid,uuid,boolean) to authenticated;
