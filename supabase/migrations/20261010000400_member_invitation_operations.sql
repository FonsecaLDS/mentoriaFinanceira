-- FIN-011: operações administrativas centralizadas no PostgreSQL.

create or replace function public.list_tenant_members(p_tenant_id uuid)
returns table (id uuid, user_id uuid, email text, full_name text, role text, status text, created_at timestamptz)
language plpgsql stable security definer set search_path = public, auth, pg_temp
as $$
begin
  if not public.is_active_tenant_member(p_tenant_id) then
    raise exception 'active membership required' using errcode = '42501';
  end if;
  return query
    select m.id, m.user_id, u.email::text, p.full_name, m.role, m.status, m.created_at
    from public.tenant_members m
    join auth.users u on u.id = m.user_id
    left join public.profiles p on p.id = m.user_id
    where m.tenant_id = p_tenant_id
    order by m.created_at;
end;
$$;

create or replace function public.create_tenant_invitation(
  p_tenant_id uuid, p_email text, p_role text, p_token_hash text, p_expires_at timestamptz
)
returns table (id uuid, tenant_id uuid, email text, role text, status text, expires_at timestamptz, invited_by uuid, created_at timestamptz)
language plpgsql security definer set search_path = public, auth, pg_temp
as $$
declare
  caller_role text;
  normalized_email text := lower(btrim(p_email));
  invitation public.tenant_invitations;
begin
  select m.role into caller_role from public.tenant_members m
  where m.tenant_id = p_tenant_id and m.user_id = auth.uid() and m.status = 'active';
  if caller_role is null or caller_role not in ('owner', 'admin') then
    raise exception 'member management permission required' using errcode = '42501';
  end if;
  if p_role not in ('admin', 'editor', 'viewer') or (caller_role = 'admin' and p_role = 'admin') then
    raise exception 'role is not allowed';
  end if;
  if normalized_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'email is invalid';
  end if;
  if char_length(p_token_hash) <> 64 or p_expires_at <= now() then
    raise exception 'invitation token or expiry is invalid';
  end if;
  if exists (
    select 1 from auth.users u join public.tenant_members m on m.user_id = u.id
    where m.tenant_id = p_tenant_id and lower(u.email) = normalized_email and m.status in ('active', 'suspended')
  ) then raise exception 'user already belongs to workspace'; end if;
  if exists (select 1 from public.tenant_invitations ti where ti.tenant_id = p_tenant_id and ti.email = normalized_email and ti.status = 'pending') then
    raise exception 'pending invitation already exists';
  end if;

  insert into public.tenant_invitations (tenant_id, email, role, token_hash, invited_by, expires_at)
  values (p_tenant_id, normalized_email, p_role, lower(p_token_hash), auth.uid(), p_expires_at)
  returning * into invitation;
  return query select invitation.id, invitation.tenant_id, invitation.email, invitation.role, invitation.status, invitation.expires_at, invitation.invited_by, invitation.created_at;
end;
$$;

create or replace function public.revoke_tenant_invitation(p_invitation_id uuid)
returns boolean language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  update public.tenant_invitations i
  set status = 'revoked'
  where i.id = p_invitation_id
    and i.status = 'pending'
    and public.has_tenant_role(i.tenant_id, array['owner', 'admin']);
  return found;
end;
$$;

create or replace function public.resend_tenant_invitation(
  p_invitation_id uuid, p_token_hash text, p_expires_at timestamptz
)
returns table (id uuid, tenant_id uuid, email text, role text, status text, expires_at timestamptz, invited_by uuid, created_at timestamptz)
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  old_invitation public.tenant_invitations;
  new_invitation public.tenant_invitations;
begin
  select i.* into old_invitation from public.tenant_invitations i where i.id = p_invitation_id for update;
  if not found or old_invitation.status <> 'pending' or not public.has_tenant_role(old_invitation.tenant_id, array['owner', 'admin']) then
    raise exception 'invitation cannot be resent' using errcode = '42501';
  end if;
  update public.tenant_invitations set status = 'revoked' where id = old_invitation.id;
  insert into public.tenant_invitations (tenant_id, email, role, token_hash, invited_by, expires_at)
  values (old_invitation.tenant_id, old_invitation.email, old_invitation.role, lower(p_token_hash), auth.uid(), p_expires_at)
  returning * into new_invitation;
  return query select new_invitation.id, new_invitation.tenant_id, new_invitation.email, new_invitation.role, new_invitation.status, new_invitation.expires_at, new_invitation.invited_by, new_invitation.created_at;
end;
$$;

create or replace function public.update_tenant_member(p_tenant_id uuid, p_member_id uuid, p_role text, p_status text)
returns public.tenant_members language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  caller_role text;
  target public.tenant_members;
  updated public.tenant_members;
begin
  select role into caller_role from public.tenant_members where tenant_id = p_tenant_id and user_id = auth.uid() and status = 'active';
  select * into target from public.tenant_members where id = p_member_id and tenant_id = p_tenant_id for update;
  if caller_role not in ('owner', 'admin') or not found then raise exception 'member management permission required' using errcode = '42501'; end if;
  if p_role not in ('owner', 'admin', 'editor', 'viewer') or p_status not in ('active', 'suspended', 'removed') then raise exception 'member role or status is invalid'; end if;
  if caller_role = 'admin' and (target.role = 'owner' or p_role in ('owner', 'admin')) then raise exception 'admin cannot manage owner or admin'; end if;
  if target.user_id = auth.uid() then raise exception 'cannot change own membership'; end if;
  if target.role = 'owner' and caller_role <> 'owner' then raise exception 'owner membership is protected'; end if;
  update public.tenant_members set role = p_role, status = p_status where id = target.id returning * into updated;
  return updated;
end;
$$;

create or replace function public.transfer_tenant_ownership(p_tenant_id uuid, p_member_id uuid)
returns public.tenant_members language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  current_owner public.tenant_members;
  target public.tenant_members;
  transferred public.tenant_members;
begin
  select * into current_owner from public.tenant_members where tenant_id = p_tenant_id and user_id = auth.uid() and role = 'owner' and status = 'active' for update;
  select * into target from public.tenant_members where id = p_member_id and tenant_id = p_tenant_id and status = 'active' for update;
  if not found or current_owner.id is null or target.user_id = current_owner.user_id then raise exception 'ownership transfer is invalid' using errcode = '42501'; end if;
  update public.tenant_members set role = 'admin' where id = current_owner.id;
  update public.tenant_members set role = 'owner' where id = target.id returning * into transferred;
  return transferred;
end;
$$;

revoke all on function public.list_tenant_members(uuid) from public, anon;
revoke all on function public.create_tenant_invitation(uuid, text, text, text, timestamptz) from public, anon;
revoke all on function public.revoke_tenant_invitation(uuid) from public, anon;
revoke all on function public.resend_tenant_invitation(uuid, text, timestamptz) from public, anon;
revoke all on function public.update_tenant_member(uuid, uuid, text, text) from public, anon;
revoke all on function public.transfer_tenant_ownership(uuid, uuid) from public, anon;
grant execute on function public.list_tenant_members(uuid) to authenticated;
grant execute on function public.create_tenant_invitation(uuid, text, text, text, timestamptz) to authenticated;
grant execute on function public.revoke_tenant_invitation(uuid) to authenticated;
grant execute on function public.resend_tenant_invitation(uuid, text, timestamptz) to authenticated;
grant execute on function public.update_tenant_member(uuid, uuid, text, text) to authenticated;
grant execute on function public.transfer_tenant_ownership(uuid, uuid) to authenticated;

