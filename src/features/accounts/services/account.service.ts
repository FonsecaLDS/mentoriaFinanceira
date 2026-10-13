import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Client = SupabaseClient<Database>;
export const accountSelect =
  "id, tenant_id, name, name_normalized, type, institution_name, currency, opening_balance, opening_date, is_active, archived_at, created_at, updated_at";
export function listAccounts(
  client: Client,
  tenantId: string,
  status = "active",
  search = "",
) {
  let query = client
    .from("accounts")
    .select(accountSelect)
    .eq("tenant_id", tenantId)
    .order("name");
  if (status !== "all") query = query.eq("is_active", status !== "inactive");
  if (search) query = query.ilike("name", `%${search}%`);
  return query;
}
export function getAccount(client: Client, tenantId: string, id: string) {
  return client
    .from("accounts")
    .select(accountSelect)
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .maybeSingle();
}
export function createAccount(client: Client, input: Record<string, unknown>) {
  return client.from("accounts").insert(input as never);
}
export function updateAccount(
  client: Client,
  id: string,
  tenantId: string,
  input: Record<string, unknown>,
) {
  return client
    .from("accounts")
    .update(input as never)
    .eq("id", id)
    .eq("tenant_id", tenantId);
}
