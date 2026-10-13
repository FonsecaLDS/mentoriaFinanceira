import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Client = SupabaseClient<Database>;
export const recurrenceSelect =
  "id, tenant_id, type, frequency, interval_count, start_date, end_date, max_occurrences, generated_count, next_run_at, day_of_month, amount, currency, description, category_id, person_id, cost_center_id, account_id, is_active, cancelled_at, created_by, created_at, updated_at";
export function listRecurrences(client: Client, tenantId: string) {
  return client
    .from("recurrence_rules")
    .select(recurrenceSelect)
    .eq("tenant_id", tenantId)
    .order("is_active", { ascending: false })
    .order("next_run_at");
}
export function createRecurrence(
  client: Client,
  args: Record<string, unknown>,
) {
  return client.rpc("create_recurrence_rule", args as never);
}
export function updateRecurrence(
  client: Client,
  args: Record<string, unknown>,
) {
  return client.rpc("update_recurrence_rule", args as never);
}
export function setRecurrenceState(
  client: Client,
  args: Record<string, unknown>,
) {
  return client.rpc("set_recurrence_state", args as never);
}
export function generateDueOccurrences(
  client: Client,
  tenantId: string,
  untilDate?: string,
) {
  return client.rpc("generate_due_occurrences", {
    p_tenant_id: tenantId,
    p_until_date: untilDate,
    p_limit: 100,
  });
}
