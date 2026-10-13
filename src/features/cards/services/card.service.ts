import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Client = SupabaseClient<Database>;
export const cardSelect =
  "id, tenant_id, name, name_normalized, institution_name, credit_limit, currency, closing_day, due_day, payment_account_id, is_active, archived_at, created_by, created_at, updated_at";
export function listCards(client: Client, tenantId: string) {
  return client
    .from("credit_cards")
    .select(cardSelect)
    .eq("tenant_id", tenantId)
    .order("is_active", { ascending: false })
    .order("name");
}
export function getCard(client: Client, tenantId: string, id: string) {
  return client
    .from("credit_cards")
    .select(cardSelect)
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .maybeSingle();
}
export function createCard(client: Client, args: Record<string, unknown>) {
  return client.rpc("create_credit_card", args as never);
}
export function updateCard(client: Client, args: Record<string, unknown>) {
  return client.rpc("update_credit_card", args as never);
}
export function setCardState(client: Client, args: Record<string, unknown>) {
  return client.rpc("set_credit_card_state", args as never);
}
