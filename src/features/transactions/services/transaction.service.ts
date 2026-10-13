import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Client = SupabaseClient<Database>;
export type TransactionFilters = {
  type?: string;
  status?: string;
  categoryId?: string;
  accountId?: string;
  personId?: string;
  costCenterId?: string;
  from?: string;
  to?: string;
  minAmount?: string;
  maxAmount?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};
export const transactionSelect =
  "id, tenant_id, type, description, amount, currency, category_id, person_id, cost_center_id, account_id, competence_date, due_date, status, notes, created_by, created_at, updated_at, cancelled_at";
export const settlementSelect =
  "id, tenant_id, transaction_id, account_id, amount, settled_at, idempotency_key, created_by, created_at, reversed_at, reversed_by, reversal_idempotency_key";

export function listTransactions(
  client: Client,
  tenantId: string,
  filters: TransactionFilters = {},
) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? 20));
  let query = client
    .from("transactions")
    .select(transactionSelect, { count: "exact" })
    .eq("tenant_id", tenantId)
    .order("competence_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (filters.type) query = query.eq("type", filters.type);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.accountId) query = query.eq("account_id", filters.accountId);
  if (filters.personId) query = query.eq("person_id", filters.personId);
  if (filters.costCenterId)
    query = query.eq("cost_center_id", filters.costCenterId);
  if (filters.from) query = query.gte("competence_date", filters.from);
  if (filters.to) query = query.lte("competence_date", filters.to);
  if (filters.minAmount)
    query = query.gte("amount", filters.minAmount.replace(",", "."));
  if (filters.maxAmount)
    query = query.lte("amount", filters.maxAmount.replace(",", "."));
  if (filters.search) query = query.ilike("description", `%${filters.search}%`);
  return query;
}
export function getTransaction(client: Client, tenantId: string, id: string) {
  return client
    .from("transactions")
    .select(transactionSelect)
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .maybeSingle();
}
export function listSettlements(
  client: Client,
  tenantId: string,
  transactionId: string,
) {
  return client
    .from("transaction_settlements")
    .select(settlementSelect)
    .eq("tenant_id", tenantId)
    .eq("transaction_id", transactionId)
    .order("settled_at", { ascending: false });
}
export async function listTransactionOptions(client: Client, tenantId: string) {
  const [
    { data: categories },
    { data: accounts },
    { data: people },
    { data: costCenters },
  ] = await Promise.all([
    client
      .from("categories")
      .select("id, name, type")
      .eq("tenant_id", tenantId)
      .order("name"),
    client
      .from("accounts")
      .select("id, name, currency, is_active")
      .eq("tenant_id", tenantId)
      .order("name"),
    client
      .from("people")
      .select("id, name, is_active")
      .eq("tenant_id", tenantId)
      .order("name"),
    client
      .from("cost_centers")
      .select("id, name, is_active")
      .eq("tenant_id", tenantId)
      .order("name"),
  ]);
  return {
    categories: categories ?? [],
    accounts: accounts ?? [],
    people: people ?? [],
    costCenters: costCenters ?? [],
  };
}
export function createTransaction(
  client: Client,
  input: Record<string, unknown>,
) {
  return client
    .from("transactions")
    .insert(input as never)
    .select(transactionSelect)
    .single();
}
export function updateTransaction(
  client: Client,
  id: string,
  tenantId: string,
  input: Record<string, unknown>,
) {
  return client
    .from("transactions")
    .update(input as never)
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .select(transactionSelect)
    .single();
}

function units(value: string | number) {
  const text = String(value).replace(",", ".");
  const [whole, fraction = ""] = text.split(".");
  return BigInt(`${whole}${fraction.padEnd(4, "0").slice(0, 4)}`);
}
function money(value: bigint) {
  const negative = value < BigInt(0);
  const absolute = negative ? -value : value;
  const text = absolute.toString().padStart(5, "0");
  return `${negative ? "-" : ""}${text.slice(0, -4)}.${text.slice(-4)}`;
}
export function pendingAmount(
  total: string | number,
  settlements: Array<{ amount: string | number }>,
) {
  return money(
    units(total) -
      settlements.reduce((sum, item) => sum + units(item.amount), BigInt(0)),
  );
}
