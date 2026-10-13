import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Client = SupabaseClient<Database>;
export function getMonthlyBudgets(
  client: Client,
  tenantId: string,
  year: number,
  month: number,
  regime: "competence" | "cash",
  currency?: string,
) {
  return client.rpc("get_budget_consumption", {
    p_tenant_id: tenantId,
    p_year: year,
    p_month: month,
    p_regime: regime,
    p_currency: currency ?? null,
  });
}
export function getBudgetAlerts(
  client: Client,
  tenantId: string,
  year: number,
  month: number,
  regime: "competence" | "cash",
) {
  return client.rpc("get_budget_alerts", {
    p_tenant_id: tenantId,
    p_year: year,
    p_month: month,
    p_regime: regime,
  });
}
