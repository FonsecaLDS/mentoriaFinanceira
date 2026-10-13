-- FIN-029: geração e fechamento de faturas por ciclo.

create table public.card_invoices (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  card_id uuid not null,
  invoice_cycle_id uuid not null,
  total_amount numeric(19,4) not null default 0 check (total_amount >= 0 and total_amount = round(total_amount, 4)),
  currency varchar(3) not null check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'open' check (status in ('open', 'closed', 'paid')),
  closed_at timestamptz null,
  paid_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, invoice_cycle_id),
  foreign key (tenant_id, card_id) references public.credit_cards(tenant_id, id) on delete restrict,
  foreign key (tenant_id, invoice_cycle_id) references public.invoice_cycles(tenant_id, id) on delete restrict,
  check ((status = 'open' and closed_at is null and paid_at is null) or (status = 'closed' and closed_at is not null and paid_at is null) or (status = 'paid' and closed_at is not null and paid_at is not null))
);

alter table public.card_installments add column invoice_id uuid null;
alter table public.card_installments add constraint card_installments_invoice_fk
  foreign key (tenant_id, invoice_id) references public.card_invoices(tenant_id, id) on delete restrict;

create index card_invoices_card_due_idx on public.card_invoices (tenant_id, card_id, status, invoice_cycle_id);
create index card_invoices_due_date_idx on public.card_invoices (tenant_id, invoice_cycle_id);
create index card_installments_invoice_idx on public.card_installments (tenant_id, invoice_id, installment_number);

create trigger card_invoices_set_updated_at before update on public.card_invoices for each row execute function public.set_updated_at();

create or replace function public.validate_card_invoice_state()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if new.tenant_id <> old.tenant_id or new.card_id <> old.card_id or new.invoice_cycle_id <> old.invoice_cycle_id then
    raise exception 'invoice identity cannot change';
  end if;
  if old.status in ('closed', 'paid') and new.status <> old.status then
    raise exception 'closed invoice cannot be reopened';
  end if;
  if new.status = 'paid' and old.status <> 'paid' then
    raise exception 'invoice payment is managed by FIN-030';
  end if;
  if old.status in ('closed', 'paid') and new.total_amount <> old.total_amount then
    raise exception 'closed invoice total cannot change';
  end if;
  return new;
end;
$$;
create trigger card_invoices_state_validation before update on public.card_invoices for each row execute function public.validate_card_invoice_state();

create or replace function public.audit_card_invoice_changes()
returns trigger language plpgsql security definer set search_path = public, auth, pg_temp as $$
begin
  perform public.write_audit_event(new.tenant_id, auth.uid(), case when tg_op = 'INSERT' then 'card_invoice.created' when new.status = 'closed' and old.status <> 'closed' then 'card_invoice.closed' else 'card_invoice.updated' end, 'card_invoice', new.id, jsonb_build_object('invoice_cycle_id', new.invoice_cycle_id, 'total_amount', new.total_amount, 'status', new.status, 'currency', new.currency));
  return new;
end;
$$;
create trigger card_invoices_audit_changes after insert or update on public.card_invoices for each row execute function public.audit_card_invoice_changes();

create or replace function public.generate_card_invoice(p_tenant_id uuid, p_card_id uuid, p_invoice_cycle_id uuid)
returns public.card_invoices language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare
  invoice public.card_invoices;
  cycle public.invoice_cycles;
  card public.credit_cards;
begin
  if not public.has_tenant_role(p_tenant_id, array['owner', 'admin', 'editor']) then raise exception 'card invoice permission denied'; end if;
  select * into cycle from public.invoice_cycles where tenant_id = p_tenant_id and id = p_invoice_cycle_id and card_id = p_card_id for update;
  if not found then raise exception 'invoice cycle not found'; end if;
  select * into card from public.credit_cards where tenant_id = p_tenant_id and id = p_card_id for update;
  if not found then raise exception 'credit card not found'; end if;
  select * into invoice from public.card_invoices where tenant_id = p_tenant_id and invoice_cycle_id = p_invoice_cycle_id for update;
  if invoice.id is not null then return invoice; end if;
  if cycle.status in ('closed', 'paid') then raise exception 'closed cycle cannot generate invoice'; end if;
  insert into public.card_invoices (tenant_id, card_id, invoice_cycle_id, currency)
  values (p_tenant_id, p_card_id, p_invoice_cycle_id, card.currency)
  on conflict (tenant_id, invoice_cycle_id) do nothing
  returning * into invoice;
  if invoice.id is null then
    select * into invoice from public.card_invoices where tenant_id = p_tenant_id and invoice_cycle_id = p_invoice_cycle_id for update;
    return invoice;
  end if;
  update public.card_installments
  set invoice_id = invoice.id
  where tenant_id = p_tenant_id and invoice_cycle_id = p_invoice_cycle_id and status = 'planned' and invoice_id is null;
  if exists (select 1 from public.card_installments where tenant_id = p_tenant_id and invoice_cycle_id = p_invoice_cycle_id and invoice_id <> invoice.id) then
    raise exception 'installment already belongs to another invoice';
  end if;
  update public.card_invoices
  set total_amount = coalesce((select sum(amount) from public.card_installments where tenant_id = p_tenant_id and invoice_id = invoice.id and status = 'planned'), 0)
  where tenant_id = p_tenant_id and id = invoice.id
  returning * into invoice;
  update public.invoice_cycles set status = 'open' where tenant_id = p_tenant_id and id = p_invoice_cycle_id and status = 'planned';
  return invoice;
end;
$$;

create or replace function public.close_card_invoice(p_tenant_id uuid, p_invoice_id uuid)
returns public.card_invoices language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare
  invoice public.card_invoices;
  expected_total numeric(19,4);
begin
  if not public.has_tenant_role(p_tenant_id, array['owner', 'admin', 'editor']) then raise exception 'card invoice permission denied'; end if;
  select * into invoice from public.card_invoices where tenant_id = p_tenant_id and id = p_invoice_id for update;
  if not found then raise exception 'card invoice not found'; end if;
  if invoice.status in ('closed', 'paid') then return invoice; end if;
  select coalesce(sum(amount), 0)::numeric(19,4) into expected_total from public.card_installments where tenant_id = p_tenant_id and invoice_id = p_invoice_id and status = 'planned';
  if expected_total <> invoice.total_amount then
    raise exception 'invoice total is inconsistent';
  end if;
  update public.card_invoices set status = 'closed', closed_at = now() where tenant_id = p_tenant_id and id = p_invoice_id returning * into invoice;
  update public.invoice_cycles set status = 'closed' where tenant_id = p_tenant_id and id = invoice.invoice_cycle_id;
  return invoice;
end;
$$;

alter table public.card_invoices enable row level security;
create policy card_invoices_select_members on public.card_invoices for select to authenticated using (public.is_active_tenant_member(tenant_id));
revoke all on table public.card_invoices from public, anon, authenticated;
grant select on public.card_invoices to authenticated;
revoke all on function public.validate_card_invoice_state(), public.audit_card_invoice_changes(), public.generate_card_invoice(uuid,uuid,uuid), public.close_card_invoice(uuid,uuid) from public, anon, authenticated;
grant execute on function public.generate_card_invoice(uuid,uuid,uuid), public.close_card_invoice(uuid,uuid) to authenticated;
