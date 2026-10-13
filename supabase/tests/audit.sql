begin;

select plan(22);

insert into auth.users (id, aud, role, email, email_confirmed_at, created_at, updated_at)
values
  ('20000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'audit-a@example.com', now(), now(), now()),
  ('20000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'audit-b@example.com', now(), now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);

select ok(
  (select relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'audit_logs'),
  'audit_logs has RLS enabled'
);
select lives_ok($$select public.create_tenant('Audit A', 'audit-a')$$, 'workspace creation succeeds');
select set_config('test.tenant_a', (select id::text from public.tenants where slug = 'audit-a'), true);
select is((select count(*) from public.audit_logs where tenant_id = current_setting('test.tenant_a')::uuid and action = 'tenant.created'), 1::bigint, 'workspace creation is audited');
select is((select actor_id from public.audit_logs where tenant_id = current_setting('test.tenant_a')::uuid and action = 'tenant.created' limit 1), auth.uid(), 'actor comes from auth.uid');
select ok(not exists (select 1 from public.audit_logs where metadata::text ilike '%token%'), 'audit metadata contains no token');

select lives_ok($$select * from public.create_tenant_invitation(current_setting('test.tenant_a')::uuid, 'audit-b@example.com', 'viewer', repeat('a', 64), now() + interval '1 day')$$, 'invitation creation succeeds');
select set_config('test.invitation_id', (select id::text from public.tenant_invitations where email = 'audit-b@example.com'), true);
select is((select count(*) from public.audit_logs where action = 'invitation.created'), 1::bigint, 'invitation creation is audited');

select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
select lives_ok($$select public.accept_tenant_invitation_by_hash(repeat('a', 64))$$, 'invitation acceptance succeeds');
select is((select count(*) from public.audit_logs where action = 'invitation.accepted'), 1::bigint, 'invitation acceptance is audited');

select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);
select lives_ok($$select public.update_tenant_member(current_setting('test.tenant_a')::uuid, (select id from public.tenant_members where tenant_id = current_setting('test.tenant_a')::uuid and user_id = '20000000-0000-0000-0000-000000000002'), 'editor', 'active')$$, 'role update succeeds');
select is((select count(*) from public.audit_logs where action = 'member.role_changed'), 1::bigint, 'role update is audited');

select lives_ok($$select * from public.create_tenant_invitation(current_setting('test.tenant_a')::uuid, 'other-audit@example.com', 'viewer', repeat('b', 64), now() + interval '1 day')$$, 'second invitation creation succeeds');
select is(public.revoke_tenant_invitation((select id from public.tenant_invitations where email = 'other-audit@example.com')), true, 'invitation revocation succeeds');
select is((select count(*) from public.audit_logs where action = 'invitation.revoked'), 1::bigint, 'invitation revocation is audited');

select throws_ok($$insert into public.audit_logs (tenant_id, actor_id, action, resource_type) values (current_setting('test.tenant_a')::uuid, '20000000-0000-0000-0000-000000000002', 'fake', 'tenant')$$, '42501', null, 'authenticated cannot insert audit logs');
select throws_ok($$update public.audit_logs set action = 'tampered' where tenant_id = current_setting('test.tenant_a')::uuid$$, '42501', null, 'authenticated cannot update audit logs');
select throws_ok($$delete from public.audit_logs where tenant_id = current_setting('test.tenant_a')::uuid$$, '42501', null, 'authenticated cannot delete audit logs');
select ok((select count(*) from public.list_tenant_audit_logs(current_setting('test.tenant_a')::uuid, 3)) <= 3, 'audit query is limited');

select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
select lives_ok($$select public.create_tenant('Audit B', 'audit-b')$$, 'second user creates another workspace');
select set_config('test.tenant_b', (select id::text from public.tenants where slug = 'audit-b'), true);
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);
select is((select count(*) from public.audit_logs where tenant_id = current_setting('test.tenant_b')::uuid), 0::bigint, 'cross-tenant audit logs are hidden');
select throws_ok($$select public.create_tenant('Duplicate audit', 'audit-a')$$, '23505', null, 'failed operation raises normally');
select is((select count(*) from public.audit_logs where tenant_id = current_setting('test.tenant_a')::uuid and action = 'tenant.created'), 1::bigint, 'failed operation creates no confirmed audit event');

select * from finish();
rollback;
