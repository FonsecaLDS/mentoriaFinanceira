import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Client = SupabaseClient<Database>;
export const peopleSelect =
  "id, tenant_id, name, name_normalized, linked_user_id, is_active, created_at, updated_at";
export const costCentersSelect =
  "id, tenant_id, name, name_normalized, description, is_active, created_at, updated_at";

export function listPeople(
  client: Client,
  tenantId: string,
  status = "all",
  search = "",
) {
  let query = client
    .from("people")
    .select(peopleSelect)
    .eq("tenant_id", tenantId)
    .order("name");
  if (status !== "all") query = query.eq("is_active", status !== "inactive");
  if (search) query = query.ilike("name", `%${search}%`);
  return query;
}
export function listCostCenters(
  client: Client,
  tenantId: string,
  status = "all",
  search = "",
) {
  let query = client
    .from("cost_centers")
    .select(costCentersSelect)
    .eq("tenant_id", tenantId)
    .order("name");
  if (status !== "all") query = query.eq("is_active", status !== "inactive");
  if (search) query = query.ilike("name", `%${search}%`);
  return query;
}
export function createPerson(client: Client, input: Record<string, unknown>) {
  return client.from("people").insert(input as never);
}
export function updatePerson(
  client: Client,
  id: string,
  tenantId: string,
  input: Record<string, unknown>,
) {
  return client
    .from("people")
    .update(input as never)
    .eq("id", id)
    .eq("tenant_id", tenantId);
}
export function createCostCenter(
  client: Client,
  input: Record<string, unknown>,
) {
  return client.from("cost_centers").insert(input as never);
}
export function updateCostCenter(
  client: Client,
  id: string,
  tenantId: string,
  input: Record<string, unknown>,
) {
  return client
    .from("cost_centers")
    .update(input as never)
    .eq("id", id)
    .eq("tenant_id", tenantId);
}
