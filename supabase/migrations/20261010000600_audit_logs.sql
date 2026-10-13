-- FIN-015: trilha de auditoria transacional e imutável para usuários comuns.

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete restrict,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null check (char_length(action) between 1 and 80),
  resource_type text not null check (char_length(resource_type) between 1 and 80),
  resource_id uuid,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index audit_logs_tenant_created_at_idx
  on public.audit_logs (tenant_id, created_at desc, id desc);
create index audit_logs_actor_created_at_idx
  on public.audit_logs (actor_id, created_at desc, id desc);
create index audit_logs_resource_idx
  on public.audit_logs (resource_type, resource_id);

alter table public.audit_logs enable row level security;

create policy audit_logs_select_members
on public.audit_logs for select to authenticated
using (tenant_id is not null and public.is_active_tenant_member(tenant_id));

revoke all on public.audit_logs from public, anon, authenticated;
grant select on public.audit_logs to authenticated;

create or replace function public.write_audit_event(
  p_tenant_id uuid,
  p_actor_id uuid,
  p_action text,
  p_resource_type text,
  p_resource_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.audit_logs (tenant_id, actor_id, action, resource_type, resource_id, metadata)
  values (
    p_tenant_id,
    p_actor_id,
    p_action,
    p_resource_type,
    p_resource_id,
    case when jsonb_typeof(coalesce(p_metadata, '{}'::jsonb)) = 'object' then coalesce(p_metadata, '{}'::jsonb) else '{}'::jsonb end
  );
end;
$$;

revoke all on function public.write_audit_event(uuid, uuid, text, text, uuid, jsonb) from public, anon, authenticated;

create or replace function public.audit_row_changes()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  tenant_id_value uuid;
  actor_id_value uuid := auth.uid();
begin
  if tg_table_name = 'tenants' then
    tenant_id_value := coalesce(new.id, old.id);
    perform public.write_audit_event(
      tenant_id_value,
      actor_id_value,
      case when tg_op = 'INSERT' then 'tenant.created' else 'tenant.updated' end,
      'tenant',
      tenant_id_value
    );
  elsif tg_table_name = 'tenant_members' then
    tenant_id_value := coalesce(new.tenant_id, old.tenant_id);
    if tg_op = 'UPDATE' then
      if old.role is distinct from new.role then
        perform public.write_audit_event(
          tenant_id_value,
          actor_id_value,
          'member.role_changed',
          'tenant_member',
          new.id,
          jsonb_build_object('from_role', old.role, 'to_role', new.role)
        );
        if old.role = 'owner' and new.role = 'admin' then
          perform public.write_audit_event(tenant_id_value, actor_id_value, 'tenant.owner_transferred', 'tenant', tenant_id_value);
        end if;
      end if;
      if old.status is distinct from new.status then
        perform public.write_audit_event(
          tenant_id_value,
          actor_id_value,
          case new.status when 'suspended' then 'member.suspended' when 'active' then 'member.reactivated' else 'member.removed' end,
          'tenant_member',
          new.id,
          jsonb_build_object('from_status', old.status, 'to_status', new.status)
        );
      end if;
    elsif tg_op = 'DELETE' then
      perform public.write_audit_event(tenant_id_value, actor_id_value, 'member.removed', 'tenant_member', old.id);
    end if;
  elsif tg_table_name = 'tenant_invitations' then
    tenant_id_value := coalesce(new.tenant_id, old.tenant_id);
    if tg_op = 'INSERT' then
      perform public.write_audit_event(
        tenant_id_value,
        actor_id_value,
        'invitation.created',
        'tenant_invitation',
        new.id,
        jsonb_build_object('role', new.role, 'status', new.status)
      );
    elsif old.status is distinct from new.status then
      perform public.write_audit_event(
        tenant_id_value,
        actor_id_value,
        case new.status when 'accepted' then 'invitation.accepted' when 'revoked' then 'invitation.revoked' else 'invitation.expired' end,
        'tenant_invitation',
        new.id,
        jsonb_build_object('from_status', old.status, 'to_status', new.status)
      );
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

revoke all on function public.audit_row_changes() from public, anon, authenticated;

create trigger audit_tenant_changes
after insert or update on public.tenants
for each row execute function public.audit_row_changes();

create trigger audit_member_changes
after update or delete on public.tenant_members
for each row execute function public.audit_row_changes();

create trigger audit_invitation_changes
after insert or update on public.tenant_invitations
for each row execute function public.audit_row_changes();

create or replace function public.list_tenant_audit_logs(
  p_tenant_id uuid,
  p_limit integer default 50,
  p_before timestamptz default null,
  p_action text default null,
  p_resource_type text default null
)
returns table (
  id uuid,
  tenant_id uuid,
  actor_id uuid,
  action text,
  resource_type text,
  resource_id uuid,
  metadata jsonb,
  created_at timestamptz
)
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $$
begin
  if p_limit not between 1 and 100 then
    raise exception 'audit log limit must be between 1 and 100';
  end if;
  return query
    select a.id, a.tenant_id, a.actor_id, a.action, a.resource_type, a.resource_id, a.metadata, a.created_at
    from public.audit_logs a
    where a.tenant_id = p_tenant_id
      and (p_before is null or a.created_at < p_before)
      and (p_action is null or a.action = p_action)
      and (p_resource_type is null or a.resource_type = p_resource_type)
    order by a.created_at desc, a.id desc
    limit p_limit;
end;
$$;

revoke all on function public.list_tenant_audit_logs(uuid, integer, timestamptz, text, text) from public, anon;
grant execute on function public.list_tenant_audit_logs(uuid, integer, timestamptz, text, text) to authenticated;
