import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

export const categorySelect =
  "id, tenant_id, parent_id, name, name_normalized, type, budget_group, color, icon, is_active, sort_order, created_at, updated_at";

type Client = SupabaseClient<Database>;

export async function listCategories(
  client: Client,
  tenantId: string,
  filters: {
    type?: "income" | "expense";
    status?: "active" | "inactive" | "all";
    search?: string;
  } = {},
) {
  let query = client
    .from("categories")
    .select(categorySelect)
    .eq("tenant_id", tenantId)
    .order("type")
    .order("sort_order")
    .order("name");
  if (filters.type) query = query.eq("type", filters.type);
  if (filters.status !== "all")
    query = query.eq("is_active", filters.status !== "inactive");
  if (filters.search) query = query.ilike("name", `%${filters.search}%`);
  return query;
}

export async function createCategory(
  client: Client,
  input: Record<string, unknown>,
) {
  return client
    .from("categories")
    .insert(input as never)
    .select(categorySelect)
    .single();
}

export async function updateCategory(
  client: Client,
  id: string,
  tenantId: string,
  input: Record<string, unknown>,
) {
  return client
    .from("categories")
    .update(input as never)
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .select(categorySelect)
    .single();
}

export async function deleteCategory(
  client: Client,
  id: string,
  tenantId: string,
) {
  return client
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);
}
