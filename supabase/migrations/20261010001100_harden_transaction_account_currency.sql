-- FIN-020: transação cadastrada em conta deve usar a mesma moeda.
create or replace function public.validate_transaction_references()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  category_type text;
  account_currency varchar(3);
begin
  if new.category_id is not null then
    select type into category_type from public.categories where tenant_id = new.tenant_id and id = new.category_id;
    if category_type is not null and category_type is distinct from new.type then
      raise exception 'transaction category type must match transaction type';
    end if;
  end if;
  if new.account_id is not null then
    select currency into account_currency from public.accounts where tenant_id = new.tenant_id and id = new.account_id;
    if account_currency is not null and account_currency <> new.currency then
      raise exception 'transaction currency must match account currency';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.validate_transaction_references() from public, anon, authenticated;
