begin;
select plan(14);

insert into auth.users (id, aud, role, email, email_confirmed_at, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'owner@example.com', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'editor@example.com', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'viewer@example.com', now(), now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select public.create_tenant('Members test', 'members-test');
select set_config('test.tenant_id', (select id::text from public.tenants where slug = 'members-test'), true);

select lives_ok(
  $$select * from public.create_tenant_invitation(current_setting('test.tenant_id')::uuid, 'EDITOR@EXAMPLE.COM', 'editor', repeat('a', 64), now() + interval '7 days')$$,
  'owner creates an editor invitation'
);
select set_config('test.invitation_id', (select id::text from public.tenant_invitations where email = 'editor@example.com'), true);
set local role postgres;
select is((select token_hash from public.tenant_invitations where id = current_setting('test.invitation_id')::uuid), repeat('a', 64), 'token is stored as a hash value only');
set local role authenticated;
select is((select count(*) from public.tenant_invitations where email = 'editor@example.com' and status = 'pending'), 1::bigint, 'pending invitation is unique');

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select lives_ok($$select public.accept_tenant_invitation_by_hash(repeat('a', 64))$$, 'invited user accepts invitation');
select is((select role from public.tenant_members where user_id = auth.uid() and tenant_id = current_setting('test.tenant_id')::uuid), 'editor', 'accepted role is preserved');
select throws_ok($$select public.accept_tenant_invitation_by_hash(repeat('a', 64))$$, 'P0001', null, 'accepted invitation cannot be reused');
select throws_ok($$select public.create_tenant_invitation(current_setting('test.tenant_id')::uuid, 'viewer@example.com', 'viewer', repeat('b', 64), now() + interval '7 days')$$, '42501', null, 'editor cannot invite');

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select is((select count(*) from public.list_tenant_members(current_setting('test.tenant_id')::uuid)), 2::bigint, 'authorized member list includes workspace members');
select lives_ok($$select public.update_tenant_member(current_setting('test.tenant_id')::uuid, (select id from public.tenant_members where user_id = '10000000-0000-0000-0000-000000000002'), 'viewer', 'active')$$, 'owner can change member role');
select is((select role from public.tenant_members where user_id = '10000000-0000-0000-0000-000000000002'), 'viewer', 'member role changed');
select throws_ok($$select public.create_tenant_invitation(current_setting('test.tenant_id')::uuid, 'viewer@example.com', 'owner', repeat('c', 64), now() + interval '7 days')$$, 'P0001', null, 'owner role cannot be invited');
select lives_ok($$select public.create_tenant_invitation(current_setting('test.tenant_id')::uuid, 'other@example.com', 'viewer', repeat('d', 64), now() + interval '7 days')$$, 'owner creates viewer invitation');
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
select throws_ok($$select public.accept_tenant_invitation_by_hash(repeat('d', 64))$$, 'P0001', null, 'wrong email cannot accept invitation');
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select is(public.revoke_tenant_invitation((select id from public.tenant_invitations where email = 'other@example.com')), true, 'owner can revoke invitation');

select * from finish();
rollback;

