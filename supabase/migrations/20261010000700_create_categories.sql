-- FIN-016: categorias financeiras por tenant, com hierarquia limitada a dois níveis.

create table public.categories (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  parent_id uuid,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  name_normalized text generated always as (lower(btrim(name))) stored,
  type text not null check (type in ('income', 'expense')),
  budget_group text check (budget_group is null or budget_group in ('fixed', 'variable', 'personal', 'savings', 'other')),
  color text check (color is null or color ~ '^#[0-9A-Fa-f]{6}$'),
  icon text check (icon is null or icon in ('briefcase-business', 'gift', 'circle-dollar-sign', 'more-horizontal', 'home', 'utensils', 'car', 'heart-pulse', 'graduation-cap', 'gamepad-2', 'shopping-bag', 'concierge-bell', 'wallet', 'banknote')),
  is_active boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, parent_id) references public.categories(tenant_id, id) on delete restrict,
  check (parent_id is null or parent_id <> id)
);

create unique index categories_sibling_name_type_idx
  on public.categories (tenant_id, coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), type, name_normalized);
create index categories_tenant_type_idx on public.categories (tenant_id, type);
create index categories_tenant_parent_idx on public.categories (tenant_id, parent_id);
create index categories_tenant_active_idx on public.categories (tenant_id, is_active);

create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

create or replace function public.validate_category_hierarchy()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  parent_category public.categories;
begin
  if new.parent_id is null then
    return new;
  end if;

  select * into parent_category
  from public.categories
  where id = new.parent_id and tenant_id = new.tenant_id;

  if not found then
    raise exception 'category parent is invalid';
  end if;
  if parent_category.parent_id is not null then
    raise exception 'category hierarchy is limited to two levels';
  end if;
  if parent_category.type <> new.type then
    raise exception 'category type must match its parent';
  end if;
  return new;
end;
$$;

create trigger categories_validate_hierarchy
before insert or update on public.categories
for each row execute function public.validate_category_hierarchy();

create or replace function public.prevent_category_delete_with_children()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if exists (select 1 from public.categories where parent_id = old.id) then
    raise exception 'category with subcategories must be deactivated instead';
  end if;
  return old;
end;
$$;

create trigger categories_prevent_delete_with_children
before delete on public.categories
for each row execute function public.prevent_category_delete_with_children();

alter table public.categories enable row level security;

create policy categories_select_members
on public.categories for select to authenticated
using (public.is_active_tenant_member(tenant_id));

create policy categories_insert_editors
on public.categories for insert to authenticated
with check (public.has_tenant_role(tenant_id, array['owner', 'admin', 'editor']));

create policy categories_update_editors
on public.categories for update to authenticated
using (public.has_tenant_role(tenant_id, array['owner', 'admin', 'editor']))
with check (public.has_tenant_role(tenant_id, array['owner', 'admin', 'editor']));

create policy categories_delete_managers
on public.categories for delete to authenticated
using (public.has_tenant_role(tenant_id, array['owner', 'admin']));

grant select, insert, update, delete on public.categories to authenticated;
revoke all on function public.validate_category_hierarchy() from public, anon, authenticated;
revoke all on function public.prevent_category_delete_with_children() from public, anon, authenticated;
