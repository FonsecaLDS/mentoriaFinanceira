begin;

select plan(11);

select ok(
  (select relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'profiles'),
  'profiles has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'tenants'),
  'tenants has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'tenant_members'),
  'tenant_members has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'tenant_invitations'),
  'tenant_invitations has RLS enabled'
);

select ok(not has_table_privilege('authenticated', 'public.tenant_members', 'UPDATE'), 'members cannot bypass member RPCs with UPDATE');
select ok(not has_table_privilege('authenticated', 'public.tenant_members', 'DELETE'), 'members cannot bypass member RPCs with DELETE');
select ok(not has_table_privilege('authenticated', 'public.tenant_invitations', 'INSERT'), 'invitations cannot bypass invitation RPCs with INSERT');
select ok(not has_table_privilege('authenticated', 'public.tenant_invitations', 'UPDATE'), 'invitations cannot bypass invitation RPCs with UPDATE');
select ok(not has_table_privilege('authenticated', 'public.tenant_invitations', 'DELETE'), 'invitations cannot bypass invitation RPCs with DELETE');

select ok(not has_function_privilege('anon', 'public.create_tenant(text,text,text,varchar,text)', 'EXECUTE'), 'anon cannot execute tenant creation RPC');
select ok(has_function_privilege('authenticated', 'public.create_tenant(text,text,text,varchar,text)', 'EXECUTE'), 'authenticated can execute tenant creation RPC');

select * from finish();
rollback;
