import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Client = SupabaseClient<Database>;
export const goalSelect =
  "id, tenant_id, name, target_amount, currency, target_date, status, created_by, created_at, updated_at";
export const reserveSelect =
  "id, tenant_id, goal_id, name, currency, is_active, created_by, created_at, updated_at";
export const reserveMovementSelect =
  "id, tenant_id, reserve_id, account_id, account_movement_id, kind, amount, currency, effective_at, idempotency_key, created_by, created_at";

export function listGoals(client: Client, tenantId: string) {
  return client
    .from("financial_goals")
    .select(goalSelect)
    .eq("tenant_id", tenantId)
    .order("status")
    .order("target_date");
}
export function getGoal(client: Client, tenantId: string, goalId: string) {
  return client
    .from("financial_goals")
    .select(goalSelect)
    .eq("tenant_id", tenantId)
    .eq("id", goalId)
    .maybeSingle();
}
export function listReserves(client: Client, tenantId: string) {
  return client
    .from("financial_reserves")
    .select(reserveSelect)
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("name");
}
export function listReserveMovements(
  client: Client,
  tenantId: string,
  reserveId?: string,
) {
  let query = client
    .from("reserve_movements")
    .select(reserveMovementSelect)
    .eq("tenant_id", tenantId)
    .order("effective_at", { ascending: false });
  if (reserveId) query = query.eq("reserve_id", reserveId);
  return query;
}
export function createGoal(client: Client, args: Record<string, unknown>) {
  return client.rpc("create_financial_goal", args as never);
}
export function updateGoal(client: Client, args: Record<string, unknown>) {
  return client.rpc("update_financial_goal", args as never);
}
export function createReserve(client: Client, args: Record<string, unknown>) {
  return client.rpc("create_financial_reserve", args as never);
}
export function allocateToReserve(
  client: Client,
  args: Record<string, unknown>,
) {
  return client.rpc("allocate_to_reserve", args as never);
}
export function withdrawFromReserve(
  client: Client,
  args: Record<string, unknown>,
) {
  return client.rpc("withdraw_from_reserve", args as never);
}
