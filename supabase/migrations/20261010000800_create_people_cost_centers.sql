-- FIN-017: responsáveis analíticos e centros de custo por tenant.

create table public.people (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  name_normalized text generated always as (lower(btrim(name))) stored,
  linked_user_id uuid null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, linked_user_id)
    references public.tenant_members(tenant_id, user_id) on delete restrict
);

create table public.cost_centers (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  name_normalized text generated always as (lower(btrim(name))) stored,
  description text check (description is null or char_length(btrim(description)) <= 500),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id)
);

create unique index people_tenant_name_idx on public.people (tenant_id, name_normalized);
create unique index cost_centers_tenant_name_idx on public.cost_centers (tenant_id, name_normalized);
create index people_tenant_active_idx on public.people (tenant_id, is_active);
create index cost_centers_tenant_active_idx on public.cost_centers (tenant_id, is_active);

create trigger people_set_updated_at before update on public.people
for each row execute function public.set_updated_at();
create trigger cost_centers_set_updated_at before update on public.cost_centers
for each row execute function public.set_updated_at();

alter table public.people enable row level security;
alter table public.cost_centers enable row level security;

create policy people_select_members on public.people for select to authenticated
using (public.is_active_tenant_member(tenant_id));
create policy people_insert_editors on public.people for insert to authenticated
with check (public.has_tenant_role(tenant_id, array['owner', 'admin', 'editor']));
create policy people_update_editors on public.people for update to authenticated
using (public.has_tenant_role(tenant_id, array['owner', 'admin', 'editor']))
with check (public.has_tenant_role(tenant_id, array['owner', 'admin', 'editor']));

create policy cost_centers_select_members on public.cost_centers for select to authenticated
using (public.is_active_tenant_member(tenant_id));
create policy cost_centers_insert_editors on public.cost_centers for insert to authenticated
with check (public.has_tenant_role(tenant_id, array['owner', 'admin', 'editor']));
create policy cost_centers_update_editors on public.cost_centers for update to authenticated
using (public.has_tenant_role(tenant_id, array['owner', 'admin', 'editor']))
with check (public.has_tenant_role(tenant_id, array['owner', 'admin', 'editor']));

revoke all on table public.people, public.cost_centers from anon, authenticated;
grant select, insert, update on table public.people, public.cost_centers to authenticated;
