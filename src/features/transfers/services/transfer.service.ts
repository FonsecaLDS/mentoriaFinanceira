import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Client = SupabaseClient<Database>;
export const transferSelect =
  "id, tenant_id, source_account_id, target_account_id, amount, currency, effective_at, description, idempotency_key, created_by, created_at, reversed_at, reversed_by, reversal_idempotency_key";
export function listTransfers(client: Client, tenantId: string) {
  return client
    .from("transfers")
    .select(transferSelect)
    .eq("tenant_id", tenantId)
    .order("effective_at", { ascending: false })
    .order("created_at", { ascending: false });
}
export function getTransfer(client: Client, tenantId: string, id: string) {
  return client
    .from("transfers")
    .select(transferSelect)
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .maybeSingle();
}
