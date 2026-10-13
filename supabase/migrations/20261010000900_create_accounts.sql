-- FIN-018: contas financeiras; saldo atual será derivado por account_movements em FIN-019.

create table public.accounts (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  name_normalized text generated always as (lower(btrim(name))) stored,
  type text not null check (type in ('checking', 'savings', 'cash', 'digital_wallet', 'benefit', 'investment_tracking', 'other')),
  institution_name text check (institution_name is null or char_length(btrim(institution_name)) between 1 and 120),
  currency varchar(3) not null check (currency ~ '^[A-Z]{3}$'),
  opening_balance numeric(19,4) not null default 0,
  opening_date date not null,
  is_active boolean not null default true,
  archived_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  check ((is_active and archived_at is null) or (not is_active and archived_at is not null))
);

create unique index accounts_tenant_name_idx on public.accounts (tenant_id, name_normalized);
create index accounts_tenant_active_idx on public.accounts (tenant_id, is_active, name);
create index accounts_tenant_type_idx on public.accounts (tenant_id, type);

create or replace function public.normalize_account_values()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.name = btrim(new.name);
  if new.institution_name is not null then
    new.institution_name = nullif(btrim(new.institution_name), '');
  end if;
  new.currency = upper(btrim(new.currency));
  if new.opening_date > current_date then
    raise exception 'opening date cannot be in the future';
  end if;
  if new.is_active then
    new.archived_at = null;
  elsif new.archived_at is null then
    new.archived_at = now();
  end if;
  return new;
end;
$$;

create or replace function public.protect_account_history()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  has_movements boolean;
begin
  if new.tenant_id is distinct from old.tenant_id then
    raise exception 'account tenant cannot be changed';
  end if;
  if new.currency is distinct from old.currency
     or new.opening_balance is distinct from old.opening_balance
     or new.opening_date is distinct from old.opening_date then
    if to_regclass('public.account_movements') is not null then
      execute 'select exists (select 1 from public.account_movements where account_id = $1)' into has_movements using old.id;
      if has_movements then
        raise exception 'account history cannot be changed after movements exist';
      end if;
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.audit_account_changes()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  perform public.write_audit_event(
    new.tenant_id, auth.uid(),
    case when tg_op = 'INSERT' then 'account.created' else 'account.updated' end,
    'account', new.id,
    jsonb_build_object(
      'type', new.type,
      'currency', new.currency,
      'opening_balance', new.opening_balance,
      'opening_date', new.opening_date,
      'is_active', new.is_active
    )
  );
  return new;
end;
$$;

create trigger accounts_normalize_values before insert or update on public.accounts
for each row execute function public.normalize_account_values();
create trigger accounts_protect_history before update on public.accounts
for each row execute function public.protect_account_history();
create trigger accounts_set_updated_at before update on public.accounts
for each row execute function public.set_updated_at();
create trigger accounts_audit_changes after insert or update on public.accounts
for each row execute function public.audit_account_changes();

alter table public.accounts enable row level security;

create policy accounts_select_members on public.accounts for select to authenticated
using (public.is_active_tenant_member(tenant_id));
create policy accounts_insert_editors on public.accounts for insert to authenticated
with check (public.has_tenant_role(tenant_id, array['owner', 'admin', 'editor']));
create policy accounts_update_editors on public.accounts for update to authenticated
using (public.has_tenant_role(tenant_id, array['owner', 'admin', 'editor']))
with check (public.has_tenant_role(tenant_id, array['owner', 'admin', 'editor']));

revoke all on table public.accounts from anon, authenticated;
grant select, insert, update on table public.accounts to authenticated;
revoke all on function public.normalize_account_values() from public, anon, authenticated;
revoke all on function public.protect_account_history() from public, anon, authenticated;
revoke all on function public.audit_account_changes() from public, anon, authenticated;
