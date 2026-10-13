import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import type { WorkspaceInput } from "../schemas/workspace.schema";

type Client = SupabaseClient<Database>;

export async function createWorkspace(client: Client, input: WorkspaceInput) {
  return client.rpc("create_tenant", {
    p_name: input.name,
    p_slug: input.slug,
    p_type: input.type,
    p_base_currency: input.baseCurrency,
    p_timezone: input.timezone,
  });
}

export function getUserWorkspaces(client: Client) {
  return client
    .from("tenants")
    .select("id, name, slug, type, base_currency, timezone")
    .order("created_at", { ascending: true });
}

export function getWorkspaceBySlug(client: Client, slug: string) {
  return client
    .from("tenants")
    .select("id, name, slug, type, base_currency, timezone")
    .eq("slug", slug)
    .maybeSingle();
}

export const getCurrentWorkspace = getWorkspaceBySlug;
export const switchWorkspace = getWorkspaceBySlug;
