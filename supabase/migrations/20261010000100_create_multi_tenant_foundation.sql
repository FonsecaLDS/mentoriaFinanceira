-- FIN-008: profiles, tenants, memberships and invitations.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.normalize_tenant_values()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.name = btrim(new.name);
  new.slug = lower(btrim(new.slug));
  new.base_currency = upper(btrim(new.base_currency));
  return new;
end;
$$;

create or replace function public.normalize_profile_values()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.full_name is not null then
    new.full_name = nullif(btrim(new.full_name), '');
  end if;
  if new.avatar_url is not null then
    new.avatar_url = nullif(btrim(new.avatar_url), '');
  end if;
  return new;
end;
$$;

create or replace function public.normalize_invitation_values()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.email = lower(btrim(new.email));
  new.role = lower(btrim(new.role));
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (full_name is null or char_length(full_name) <= 200),
  avatar_url text check (avatar_url is null or char_length(avatar_url) <= 2048),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tenants (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  slug text not null unique check (
    char_length(slug) between 3 and 80
    and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  type text not null check (type in ('individual', 'family', 'business')),
  base_currency varchar(3) not null default 'BRL' check (base_currency ~ '^[A-Z]{3}$'),
  timezone text not null default 'America/Sao_Paulo' check (char_length(timezone) between 1 and 80),
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tenant_members (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'editor', 'viewer')),
  status text not null default 'active' check (status in ('active', 'suspended', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

create table public.tenant_invitations (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  email text not null check (
    char_length(email) between 3 and 320
    and position('@' in email) > 1
  ),
  role text not null check (role in ('admin', 'editor', 'viewer')),
  token_hash text not null check (char_length(token_hash) >= 32),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  invited_by uuid not null references auth.users (id),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index tenant_invitations_pending_email_idx
  on public.tenant_invitations (tenant_id, email)
  where status = 'pending';

create index tenant_members_tenant_idx on public.tenant_members (tenant_id);
create index tenant_members_user_idx on public.tenant_members (user_id);
create index tenant_invitations_tenant_status_idx
  on public.tenant_invitations (tenant_id, status, expires_at);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger profiles_normalize_values
before insert or update on public.profiles
for each row execute function public.normalize_profile_values();

create trigger tenants_set_updated_at
before update on public.tenants
for each row execute function public.set_updated_at();

create trigger tenants_normalize_values
before insert or update on public.tenants
for each row execute function public.normalize_tenant_values();

create trigger tenant_members_set_updated_at
before update on public.tenant_members
for each row execute function public.set_updated_at();

create trigger tenant_invitations_normalize_values
before insert or update on public.tenant_invitations
for each row execute function public.normalize_invitation_values();

create or replace function public.protect_tenant_created_by()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.created_by is distinct from old.created_by then
    raise exception 'created_by cannot be changed';
  end if;
  return new;
end;
$$;

create trigger tenants_protect_created_by
before update on public.tenants
for each row execute function public.protect_tenant_created_by();

create or replace function public.protect_membership_identity()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.tenant_id is distinct from old.tenant_id
     or new.user_id is distinct from old.user_id then
    raise exception 'tenant_id and user_id cannot be changed';
  end if;
  return new;
end;
$$;

create trigger tenant_members_protect_identity
before update on public.tenant_members
for each row execute function public.protect_membership_identity();

create or replace function public.assert_tenant_has_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_tenant_id uuid;
begin
  if tg_table_name = 'tenants' then
    target_tenant_id = new.id;
  else
    target_tenant_id = coalesce(new.tenant_id, old.tenant_id);
  end if;

  if not exists (
    select 1
    from public.tenant_members
    where tenant_id = target_tenant_id
      and role = 'owner'
      and status = 'active'
  ) then
    raise exception 'tenant must have at least one active owner';
  end if;
  return null;
end;
$$;

create constraint trigger tenants_require_owner
after insert on public.tenants
deferrable initially deferred
for each row execute function public.assert_tenant_has_owner();

create constraint trigger tenant_members_require_owner
after insert or update or delete on public.tenant_members
deferrable initially deferred
for each row execute function public.assert_tenant_has_owner();

create or replace function public.is_active_tenant_member(target_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.tenant_members
    where tenant_id = target_tenant_id
      and user_id = auth.uid()
      and status = 'active'
  );
$$;

create or replace function public.has_tenant_role(target_tenant_id uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.tenant_members
    where tenant_id = target_tenant_id
      and user_id = auth.uid()
      and status = 'active'
      and role = any (allowed_roles)
  );
$$;

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
begin
  if current_user_id is null then
    raise exception 'authenticated user required';
  end if;

  insert into public.tenants (name, slug, type, base_currency, timezone, created_by)
  values (p_name, p_slug, p_type, p_base_currency, p_timezone, current_user_id)
  returning * into new_tenant;

  insert into public.tenant_members (tenant_id, user_id, role)
  values (new_tenant.id, current_user_id, 'owner');

  return new_tenant;
end;
$$;

create or replace function public.accept_tenant_invitation_by_hash(p_token_hash text)
returns public.tenant_members
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text;
  invitation public.tenant_invitations;
  new_member public.tenant_members;
begin
  if current_user_id is null then
    raise exception 'authenticated user required';
  end if;

  select lower(email) into current_email
  from auth.users
  where id = current_user_id;

  select * into invitation
  from public.tenant_invitations
  where token_hash = p_token_hash
    and status = 'pending'
    and expires_at > now()
    and lower(email) = current_email
  for update;

  if not found then
    raise exception 'valid invitation not found';
  end if;

  insert into public.tenant_members (tenant_id, user_id, role)
  values (invitation.tenant_id, current_user_id, invitation.role)
  returning * into new_member;

  update public.tenant_invitations
  set status = 'accepted', accepted_at = now()
  where id = invitation.id;

  return new_member;
end;
$$;

revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.normalize_tenant_values() from public, anon, authenticated;
revoke execute on function public.normalize_profile_values() from public, anon, authenticated;
revoke execute on function public.normalize_invitation_values() from public, anon, authenticated;
revoke execute on function public.protect_tenant_created_by() from public, anon, authenticated;
revoke execute on function public.protect_membership_identity() from public, anon, authenticated;
revoke execute on function public.assert_tenant_has_owner() from public, anon, authenticated;
revoke execute on function public.is_active_tenant_member(uuid) from public, anon;
revoke execute on function public.has_tenant_role(uuid, text[]) from public, anon;
revoke execute on function public.create_tenant(text, text, text, varchar, text) from public, anon;
revoke execute on function public.accept_tenant_invitation_by_hash(text) from public, anon;
grant execute on function public.is_active_tenant_member(uuid) to authenticated;
grant execute on function public.has_tenant_role(uuid, text[]) to authenticated;
grant execute on function public.create_tenant(text, text, text, varchar, text) to authenticated;
grant execute on function public.accept_tenant_invitation_by_hash(text) to authenticated;

alter table public.profiles enable row level security;
alter table public.tenants enable row level security;
alter table public.tenant_members enable row level security;
alter table public.tenant_invitations enable row level security;

create policy profiles_select_own
on public.profiles for select to authenticated
using (id = auth.uid());

create policy profiles_insert_own
on public.profiles for insert to authenticated
with check (id = auth.uid());

create policy profiles_update_own
on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy profiles_delete_denied
on public.profiles for delete to authenticated
using (false);

create policy tenants_select_members
on public.tenants for select to authenticated
using (public.is_active_tenant_member(id));

create policy tenants_insert_via_rpc_only
on public.tenants for insert to authenticated
with check (false);

create policy tenants_update_managers
on public.tenants for update to authenticated
using (public.has_tenant_role(id, array['owner', 'admin']))
with check (public.has_tenant_role(id, array['owner', 'admin']));

create policy tenants_delete_denied
on public.tenants for delete to authenticated
using (false);

create policy tenant_members_select_members
on public.tenant_members for select to authenticated
using (public.is_active_tenant_member(tenant_id));

create policy tenant_members_insert_via_secure_function
on public.tenant_members for insert to authenticated
with check (false);

create policy tenant_members_update_managers
on public.tenant_members for update to authenticated
using (public.has_tenant_role(tenant_id, array['owner', 'admin']))
with check (
  public.has_tenant_role(tenant_id, array['owner', 'admin'])
  and role <> 'owner'
    or public.has_tenant_role(tenant_id, array['owner'])
);

create policy tenant_members_delete_managers
on public.tenant_members for delete to authenticated
using (public.has_tenant_role(tenant_id, array['owner', 'admin']));

create policy tenant_invitations_select_managers
on public.tenant_invitations for select to authenticated
using (public.has_tenant_role(tenant_id, array['owner', 'admin']));

create policy tenant_invitations_insert_managers
on public.tenant_invitations for insert to authenticated
with check (
  public.has_tenant_role(tenant_id, array['owner', 'admin'])
  and role <> 'owner'
  and invited_by = auth.uid()
);

create policy tenant_invitations_update_managers
on public.tenant_invitations for update to authenticated
using (public.has_tenant_role(tenant_id, array['owner', 'admin']))
with check (
  public.has_tenant_role(tenant_id, array['owner', 'admin'])
  and role <> 'owner'
);

create policy tenant_invitations_delete_managers
on public.tenant_invitations for delete to authenticated
using (public.has_tenant_role(tenant_id, array['owner', 'admin']));

revoke all on table public.profiles from anon, authenticated;
grant select, insert, update on table public.profiles to authenticated;

revoke all on table public.tenants from anon, authenticated;
grant select, update on table public.tenants to authenticated;

revoke all on table public.tenant_members from anon, authenticated;
grant select, update, delete on table public.tenant_members to authenticated;

revoke all on table public.tenant_invitations from anon, authenticated;
grant insert, update, delete on table public.tenant_invitations to authenticated;
grant select (id, tenant_id, email, role, status, invited_by, expires_at, accepted_at, created_at)
on table public.tenant_invitations to authenticated;
