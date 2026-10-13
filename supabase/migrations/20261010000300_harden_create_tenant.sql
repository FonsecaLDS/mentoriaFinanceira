-- FIN-010: validações de domínio permanecem no banco, junto da transação.

create or replace function public.create_tenant(
  p_name text,
  p_slug text,
  p_type text default 'individual',
  p_base_currency varchar(3) default 'BRL',
  p_timezone text default 'America/Sao_Paulo'
)
returns public.tenants
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  new_tenant public.tenants;
  current_user_id uuid := auth.uid();
  normalized_name text := btrim(coalesce(p_name, ''));
  normalized_slug text := lower(btrim(coalesce(p_slug, '')));
  normalized_currency text := upper(btrim(coalesce(p_base_currency, '')));
  normalized_timezone text := btrim(coalesce(p_timezone, ''));
begin
  if current_user_id is null then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;
  if char_length(normalized_name) not between 1 and 120 then
    raise exception 'workspace name must contain 1 to 120 characters';
  end if;
  if normalized_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
     or char_length(normalized_slug) not between 3 and 80 then
    raise exception 'workspace slug is invalid';
  end if;
  if p_type not in ('individual', 'family', 'business') then
    raise exception 'workspace type is invalid';
  end if;
  if normalized_currency !~ '^[A-Z]{3}$' then
    raise exception 'base currency is invalid';
  end if;
  if not exists (select 1 from pg_timezone_names where name = normalized_timezone) then
    raise exception 'timezone is invalid';
  end if;

  insert into public.tenants (name, slug, type, base_currency, timezone, created_by)
  values (normalized_name, normalized_slug, p_type, normalized_currency, normalized_timezone, current_user_id)
  returning * into new_tenant;

  insert into public.tenant_members (tenant_id, user_id, role)
  values (new_tenant.id, current_user_id, 'owner');

  return new_tenant;
end;
$$;

revoke execute on function public.create_tenant(text, text, text, varchar, text) from public, anon;
grant execute on function public.create_tenant(text, text, text, varchar, text) to authenticated;

