-- FIN-012: operações administrativas passam pelas RPCs autorizadas.

drop policy tenant_members_delete_managers on public.tenant_members;
create policy tenant_members_delete_managers
on public.tenant_members for delete to authenticated
using (
  public.has_tenant_role(tenant_id, array['owner', 'admin'])
  and (role <> 'owner' or public.has_tenant_role(tenant_id, array['owner']))
);

revoke update, delete on public.tenant_members from authenticated;
revoke insert, update, delete on public.tenant_invitations from authenticated;

