begin;
select plan(18);

insert into auth.users (id, aud, role, email, email_confirmed_at, created_at, updated_at) values
  ('40000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'people-owner@example.com', now(), now(), now()),
  ('40000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'people-editor@example.com', now(), now(), now()),
  ('40000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'people-viewer@example.com', now(), now(), now());
set local role authenticated;
select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000001', true);
select public.create_tenant('People A', 'people-a');
select set_config('test.tenant_a', (select id::text from public.tenants where slug = 'people-a'), true);
select public.create_tenant('People B', 'people-b');
select set_config('test.tenant_b', (select id::text from public.tenants where slug = 'people-b'), true);
set local role postgres;
insert into public.tenant_members (tenant_id, user_id, role) values
  (current_setting('test.tenant_a')::uuid, '40000000-0000-0000-0000-000000000002', 'editor'),
  (current_setting('test.tenant_a')::uuid, '40000000-0000-0000-0000-000000000003', 'viewer'),
  (current_setting('test.tenant_b')::uuid, '40000000-0000-0000-0000-000000000002', 'editor');
set local role authenticated;

select ok((select relrowsecurity from pg_class where oid = 'public.people'::regclass), 'people has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.cost_centers'::regclass), 'cost centers have RLS');
select lives_ok($$insert into public.people (tenant_id, name) values (current_setting('test.tenant_a')::uuid, ' Família ')$$, 'owner creates person');
select lives_ok($$insert into public.cost_centers (tenant_id, name, description) values (current_setting('test.tenant_a')::uuid, ' Casa ', 'Moradia')$$, 'owner creates cost center');
select throws_ok($$insert into public.people (tenant_id, name) values (current_setting('test.tenant_a')::uuid, 'FAMÍLIA')$$, '23505', null, 'person names are unique normalized');
select throws_ok($$insert into public.cost_centers (tenant_id, name) values (current_setting('test.tenant_a')::uuid, 'CASA')$$, '23505', null, 'cost center names are unique normalized');
select lives_ok($$insert into public.people (tenant_id, name, linked_user_id) values (current_setting('test.tenant_a')::uuid, 'Editor', '40000000-0000-0000-0000-000000000002')$$, 'person links same tenant member');
select throws_ok($$insert into public.people (tenant_id, name, linked_user_id) values (current_setting('test.tenant_b')::uuid, 'Cross tenant', '40000000-0000-0000-0000-000000000003')$$, '23503', null, 'linked user must belong to same tenant');
select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000002', true);
select lives_ok($$insert into public.cost_centers (tenant_id, name) values (current_setting('test.tenant_a')::uuid, 'Projetos')$$, 'editor creates cost center');
select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000003', true);
select lives_ok($$update public.people set name = 'Viewer edit' where tenant_id = current_setting('test.tenant_a')::uuid$$, 'viewer update is safely ignored by RLS');
select is((select count(*) from public.people where tenant_id = current_setting('test.tenant_a')::uuid and name_normalized = 'viewer edit'), 0::bigint, 'viewer cannot edit people');
select throws_ok($$insert into public.cost_centers (tenant_id, name) values (current_setting('test.tenant_a')::uuid, 'Viewer center')$$, '42501', null, 'viewer cannot create cost centers');
select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000001', true);
select lives_ok($$update public.people set is_active = false where tenant_id = current_setting('test.tenant_a')::uuid and name_normalized = 'família'$$, 'owner deactivates person');
select is((select is_active from public.people where tenant_id = current_setting('test.tenant_a')::uuid and name_normalized = 'família'), false, 'person is inactive');
select is((select count(*) from public.people where tenant_id = current_setting('test.tenant_b')::uuid), 0::bigint, 'tenants do not share people');
select is((select count(*) from public.cost_centers where tenant_id = current_setting('test.tenant_b')::uuid), 0::bigint, 'tenants do not share cost centers');
select ok(not has_table_privilege('authenticated', 'public.people', 'DELETE'), 'people cannot be physically deleted by app role');
select ok(not has_table_privilege('authenticated', 'public.cost_centers', 'DELETE'), 'cost centers cannot be physically deleted by app role');
select * from finish();
rollback;
