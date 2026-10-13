import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Client = SupabaseClient<Database>;
export function getMonthlyPlan(
  client: Client,
  tenantId: string,
  year: number,
  month: number,
) {
  return client.rpc("get_monthly_plan", {
    p_tenant_id: tenantId,
    p_year: year,
    p_month: month,
  });
}
export function getMonthlyComparison(
  client: Client,
  tenantId: string,
  year: number,
  month: number,
  regime: "competence" | "cash",
  filters: { categoryId?: string; accountId?: string; personId?: string } = {},
) {
  return client.rpc("get_monthly_comparison", {
    p_tenant_id: tenantId,
    p_year: year,
    p_month: month,
    p_regime: regime,
    p_category_id: filters.categoryId ?? null,
    p_account_id: filters.accountId ?? null,
    p_person_id: filters.personId ?? null,
  });
}
export function getMonthlySummary(
  client: Client,
  tenantId: string,
  year: number,
  month: number,
  regime: "competence" | "cash",
) {
  return client.rpc("get_monthly_summary", {
    p_tenant_id: tenantId,
    p_year: year,
    p_month: month,
    p_regime: regime,
  });
}
