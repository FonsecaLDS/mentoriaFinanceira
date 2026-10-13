import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Client = SupabaseClient<Database>;

export function getAccountBalance(
  client: Client,
  accountId: string,
  asOf?: string,
) {
  return client.rpc("get_account_balance", {
    p_account_id: accountId,
    ...(asOf ? { p_as_of: asOf } : {}),
  });
}

export function getAccountBalances(
  client: Client,
  tenantId: string,
  asOf?: string,
) {
  return client.rpc("get_account_balances", {
    p_tenant_id: tenantId,
    ...(asOf ? { p_as_of: asOf } : {}),
  });
}

export function getCashResult(
  client: Client,
  tenantId: string,
  from: string,
  to: string,
  currency?: string,
) {
  return client.rpc("get_cash_result", {
    p_tenant_id: tenantId,
    p_from: from,
    p_to: to,
    ...(currency ? { p_currency: currency } : {}),
  });
}

export function getAccrualResult(
  client: Client,
  tenantId: string,
  from: string,
  to: string,
  currency?: string,
) {
  return client.rpc("get_accrual_result", {
    p_tenant_id: tenantId,
    p_from: from,
    p_to: to,
    ...(currency ? { p_currency: currency } : {}),
  });
}

export function getProjectedBalance(
  client: Client,
  accountId: string,
  asOf?: string,
) {
  return client.rpc("get_projected_balance", {
    p_account_id: accountId,
    ...(asOf ? { p_as_of: asOf } : {}),
  });
}

export function getFinancialSummary(
  client: Client,
  tenantId: string,
  from: string,
  to: string,
  asOf?: string,
) {
  return client.rpc("get_financial_summary", {
    p_tenant_id: tenantId,
    p_from: from,
    p_to: to,
    ...(asOf ? { p_as_of: asOf } : {}),
  });
}
