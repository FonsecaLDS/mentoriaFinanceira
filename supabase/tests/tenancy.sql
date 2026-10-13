begin;

select plan(25);

insert into auth.users (id, aud, role, email, email_confirmed_at, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'a@example.com', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'b@example.com', now(), now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);

select lives_ok(
  $$update public.profiles set full_name = 'Pessoa A' where id = auth.uid()$$,
  'user A can update own profile'
);
select is(
  (select count(*) from public.profiles where id = '00000000-0000-0000-0000-000000000001'),
  1::bigint,
  'profile belongs to user A'
);
select lives_ok(
  $$select public.create_tenant('Tenant A', 'Tenant-A', 'family', 'BRL', 'America/Sao_Paulo')$$,
  'user A creates tenant and owner atomically'
);
select set_config(
  'test.tenant_a',
  (select id::text from public.tenants where slug = 'tenant-a'),
  true
);
select is(
  (select count(*) from public.tenant_members where tenant_id = current_setting('test.tenant_a')::uuid and role = 'owner' and status = 'active'),
  1::bigint,
  'tenant A has one active owner'
);
select is(
  (select count(*) from public.tenants where slug = 'tenant-a'),
  1::bigint,
  'tenant slug is normalized'
);

select throws_ok(
  $$select public.create_tenant('Duplicate', 'TENANT-A')$$,
  '23505',
  null,
  'duplicate slug is rejected'
);
select throws_ok(
  $$select public.create_tenant('Invalid slug', 'not valid')$$,
  'P0001',
  null,
  'invalid slug is rejected by the database'
);
select throws_ok(
  $$select public.create_tenant('Invalid timezone', 'invalid-timezone', 'individual', 'BRL', 'Mars/None')$$,
  'P0001',
  null,
  'invalid timezone is rejected by the database'
);
select is(
  (select count(*) from public.tenants where slug in ('not valid', 'invalid-timezone')),
  0::bigint,
  'rejected workspace input leaves no tenant behind'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
select lives_ok(
  $$update public.profiles set full_name = 'Pessoa B' where id = auth.uid()$$,
  'user B can update own profile'
);
select lives_ok(
  $$select public.create_tenant('Tenant B', 'tenant-b')$$,
  'user B creates tenant B'
);
select set_config(
  'test.tenant_b',
  (select id::text from public.tenants where slug = 'tenant-b'),
  true
);

select is(
  (select count(*) from public.tenants where id = current_setting('test.tenant_a')::uuid),
  0::bigint,
  'user B cannot read tenant A'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select is(
  (select count(*) from public.tenants where id = current_setting('test.tenant_b')::uuid),
  0::bigint,
  'user A cannot read tenant B'
);
select lives_ok(
  $$select * from public.create_tenant_invitation(current_setting('test.tenant_a')::uuid, 'B@EXAMPLE.COM', 'viewer', repeat('a', 64), now() + interval '1 day')$$,
  'owner can create a non-owner invitation'
);
select ok(
  not has_column_privilege('authenticated', 'public.tenant_invitations', 'token_hash', 'SELECT'),
  'authenticated role cannot select token_hash'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
select lives_ok(
  $$select public.accept_tenant_invitation_by_hash(repeat('a', 64))$$,
  'invitee can consume a valid invitation once'
);
select is(
  (select count(*) from public.tenant_members where tenant_id = current_setting('test.tenant_a')::uuid and user_id = auth.uid() and role = 'viewer'),
  1::bigint,
  'invitee is added with the invited role'
);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
set constraints all immediate;
select is(
  (select count(*) from public.tenant_invitations where status = 'accepted'),
  1::bigint,
  'invitation is marked accepted'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
select is(
  (select count(*) from public.tenant_members where tenant_id = current_setting('test.tenant_a')::uuid and user_id = auth.uid() and role = 'viewer'),
  1::bigint,
  'invitee cannot self-promote through membership RLS'
);
select throws_ok(
  $$update public.tenant_members set role = 'admin' where tenant_id = current_setting('test.tenant_a')::uuid and user_id = auth.uid()$$,
  '42501',
  null,
  'viewer cannot update membership directly'
);
select is(
  (select role from public.tenant_members where tenant_id = current_setting('test.tenant_a')::uuid and user_id = auth.uid()),
  'viewer',
  'viewer cannot update membership'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select throws_ok(
  $$update public.tenants set created_by = '00000000-0000-0000-0000-000000000002' where id = current_setting('test.tenant_a')::uuid$$,
  'P0001',
  null,
  'created_by cannot be changed'
);

set constraints all immediate;
select throws_ok(
  $$delete from public.tenant_members where tenant_id = current_setting('test.tenant_a')::uuid and user_id = auth.uid()$$,
  '42501',
  null,
  'membership changes use protected operations'
);
set constraints all deferred;

select set_config('request.jwt.claim.sub', '', true);
set local role anon;
select ok(
  not has_table_privilege('anon', 'public.tenants', 'SELECT'),
  'anonymous role cannot read tenants'
);
select throws_ok(
  $$select public.create_tenant('Anonymous', 'anonymous')$$,
  '42501',
  null,
  'anonymous role cannot create a tenant'
);

select * from finish();
rollback;
