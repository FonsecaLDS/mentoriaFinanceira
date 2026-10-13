begin;

select plan(23);

select ok((select relrowsecurity from pg_class where oid = 'public.categories'::regclass), 'categories has RLS enabled');
select ok(to_regclass('public.categories') is not null, 'categories table exists');

insert into auth.users (id, aud, role, email, email_confirmed_at, created_at, updated_at)
values
  ('30000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'category-owner@example.com', now(), now(), now()),
  ('30000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'category-editor@example.com', now(), now(), now()),
  ('30000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'category-viewer@example.com', now(), now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000001', true);
select public.create_tenant('Categories A', 'categories-a');
select set_config('test.tenant_a', (select id::text from public.tenants where slug = 'categories-a'), true);
set local role postgres;
insert into public.tenant_members (tenant_id, user_id, role)
values
  (current_setting('test.tenant_a')::uuid, '30000000-0000-0000-0000-000000000002', 'editor'),
  (current_setting('test.tenant_a')::uuid, '30000000-0000-0000-0000-000000000003', 'viewer');
set local role authenticated;

select lives_ok($$insert into public.categories (tenant_id, name, type, budget_group, color, icon) values (current_setting('test.tenant_a')::uuid, '  Moradia  ', 'expense', 'fixed', '#245CF6', 'home')$$, 'owner creates an expense category');
select set_config('test.parent_id', (select id::text from public.categories where tenant_id = current_setting('test.tenant_a')::uuid and name_normalized = 'moradia'), true);
select lives_ok($$insert into public.categories (tenant_id, parent_id, name, type, budget_group, color, icon) values (current_setting('test.tenant_a')::uuid, current_setting('test.parent_id')::uuid, 'Aluguel', 'expense', 'fixed', '#0CA678', 'home')$$, 'owner creates a valid subcategory');
select throws_ok($$insert into public.categories (tenant_id, parent_id, name, type) values (current_setting('test.tenant_a')::uuid, current_setting('test.parent_id')::uuid, 'Income child', 'income')$$, 'P0001', null, 'parent and child types must match');
select throws_ok($$insert into public.categories (tenant_id, parent_id, name, type) values (current_setting('test.tenant_a')::uuid, (select id from public.categories where name_normalized = 'aluguel'), 'Third level', 'expense')$$, 'P0001', null, 'hierarchy is limited to two levels');
select throws_ok($$insert into public.categories (tenant_id, name, type) values (current_setting('test.tenant_a')::uuid, 'MORADIA', 'expense')$$, '23505', null, 'normalized sibling names are unique');
select throws_ok($$insert into public.categories (tenant_id, name, type, color) values (current_setting('test.tenant_a')::uuid, 'Bad color', 'expense', 'blue')$$, '23514', null, 'color format is validated');
select lives_ok($$update public.categories set name = 'Casa', is_active = false where id = current_setting('test.parent_id')::uuid$$, 'owner edits and deactivates a category');
select is((select is_active from public.categories where id = current_setting('test.parent_id')::uuid), false, 'category is inactive');
select lives_ok($$update public.categories set is_active = true where id = current_setting('test.parent_id')::uuid$$, 'owner reactivates a category');
select is((select is_active from public.categories where id = current_setting('test.parent_id')::uuid), true, 'category is active again');
select throws_ok($$delete from public.categories where id = current_setting('test.parent_id')::uuid$$, 'P0001', null, 'category with children cannot be deleted');

select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000002', true);
select lives_ok($$insert into public.categories (tenant_id, name, type, budget_group, icon) values (current_setting('test.tenant_a')::uuid, 'Freelance', 'income', 'other', 'briefcase-business')$$, 'editor creates a category');
select lives_ok($$update public.categories set name = 'Freelance Projetos' where tenant_id = current_setting('test.tenant_a')::uuid and name_normalized = 'freelance'$$, 'editor edits a category');

select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000003', true);
select throws_ok($$insert into public.categories (tenant_id, name, type) values (current_setting('test.tenant_a')::uuid, 'Viewer category', 'expense')$$, '42501', null, 'viewer cannot create categories');
select is((select count(*) from public.categories where tenant_id = current_setting('test.tenant_a')::uuid and name_normalized = 'viewer edit'), 0::bigint, 'viewer cannot edit categories');
select is((select count(*) from public.categories where tenant_id = current_setting('test.tenant_a')::uuid), 3::bigint, 'viewer can list tenant categories');

select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000001', true);
select lives_ok($$select public.create_tenant('Categories B', 'categories-b')$$, 'owner creates a second tenant');
select set_config('test.tenant_b', (select id::text from public.tenants where slug = 'categories-b'), true);
select is((select count(*) from public.categories where tenant_id = current_setting('test.tenant_b')::uuid), 0::bigint, 'new tenant has no shared categories');
select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000002', true);
select throws_ok($$insert into public.categories (tenant_id, name, type) values (current_setting('test.tenant_b')::uuid, 'Cross tenant parent', 'expense')$$, '42501', null, 'tenant access is required for another tenant');
select is((select count(*) from public.categories where tenant_id = current_setting('test.tenant_b')::uuid), 0::bigint, 'tenant access is required for another tenant');
select is((select count(*) from public.categories where tenant_id = current_setting('test.tenant_a')::uuid and name_normalized = 'viewer category'), 0::bigint, 'cross-tenant insert leaves no category');

select * from finish();
rollback;
