import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import {
  listCardInvoices,
  listInvoiceCycles,
  sumMoney,
} from "@/features/card-purchases/services/purchase.service";
import {
  listGoals,
  listReserveMovements,
  listReserves,
} from "@/features/goals/services/goal.service";
import {
  getAccountBalances,
  getFinancialSummary,
} from "@/features/balances/services/balance.service";

type Client = SupabaseClient<Database>;

export type DashboardPeriod = {
  from: string;
  to: string;
  asOf: string;
  currency?: string;
  accountId?: string;
  regime: "cash" | "competence";
  granularity: "day" | "week" | "month";
};

export function getMonthBounds(month: string, now = new Date()) {
  const match = month.match(/^(\d{4})-(\d{2})$/);
  const year = match ? Number(match[1]) : now.getFullYear();
  const monthNumber = match ? Number(match[2]) : now.getMonth() + 1;
  const safeMonth = Math.min(12, Math.max(1, monthNumber));
  const paddedMonth = String(safeMonth).padStart(2, "0");
  const lastDay = new Date(Date.UTC(year, safeMonth, 0)).getUTCDate();
  return {
    from: `${year}-${paddedMonth}-01`,
    to: `${year}-${paddedMonth}-${lastDay}`,
  };
}

export async function getDashboardSummary(
  client: Client,
  tenantId: string,
  period: DashboardPeriod,
) {
  const [
    summary,
    balances,
    payments,
    invoices,
    cycles,
    cards,
    goals,
    reserves,
    movements,
    series,
  ] = await Promise.all([
    getFinancialSummary(client, tenantId, period.from, period.to, period.asOf),
    getAccountBalances(client, tenantId, period.asOf),
    client
      .from("transactions")
      .select("id, description, amount, currency, type, status, due_date")
      .eq("tenant_id", tenantId)
      .in("status", ["planned", "pending", "partially_paid"])
      .gte("due_date", period.from)
      .lte("due_date", period.to)
      .order("due_date")
      .limit(6),
    listCardInvoices(client, tenantId),
    listInvoiceCycles(client, tenantId),
    client.from("credit_cards").select("id, name").eq("tenant_id", tenantId),
    listGoals(client, tenantId),
    listReserves(client, tenantId),
    listReserveMovements(client, tenantId),
    client.rpc("get_cash_flow_series", {
      p_tenant_id: tenantId,
      p_from: period.from,
      p_to: period.to,
      p_account_id: period.accountId,
      p_currency: period.currency,
      p_regime: period.regime,
      p_granularity: period.granularity,
    }),
  ]);

  const responses = [
    summary,
    balances,
    payments,
    invoices,
    cycles,
    cards,
    goals,
    reserves,
    movements,
    series,
  ];
  const failure = responses.find((response) => response.error);
  if (failure?.error) throw new Error(failure.error.message);

  const cycleDates = new Map(
    (cycles.data ?? []).map((cycle) => [cycle.id, cycle.due_date]),
  );
  const cardNames = new Map(
    (cards.data ?? []).map((card) => [card.id, card.name]),
  );
  const reserveTotals = new Map<string, string[]>();
  for (const movement of movements.data ?? []) {
    const current = reserveTotals.get(movement.reserve_id) ?? [];
    current.push(String(movement.amount));
    reserveTotals.set(movement.reserve_id, current);
  }

  return {
    summary: summary.data ?? [],
    balances: (balances.data ?? []).filter(
      (balance) => !period.currency || balance.currency === period.currency,
    ),
    payments: (payments.data ?? []).filter(
      (payment) => !period.currency || payment.currency === period.currency,
    ),
    invoices: (invoices.data ?? [])
      .filter((invoice) => invoice.status !== "paid")
      .map((invoice) => ({
        ...invoice,
        card_name: cardNames.get(invoice.card_id) ?? "Cartão",
        due_date: cycleDates.get(invoice.invoice_cycle_id) ?? null,
      }))
      .filter(
        (invoice) => !period.currency || invoice.currency === period.currency,
      )
      .slice(0, 6),
    goals: (goals.data ?? [])
      .filter((goal) => !period.currency || goal.currency === period.currency)
      .map((goal) => {
        const reserve = (reserves.data ?? []).find(
          (item) => item.goal_id === goal.id,
        );
        return {
          ...goal,
          reserved_amount: reserve
            ? sumMoney(reserveTotals.get(reserve.id) ?? [])
            : "0.0000",
          reserve_name: reserve?.name ?? null,
        };
      }),
    series: (series.data ?? []).filter(
      (point) =>
        point.currency === (period.currency ?? summary.data?.[0]?.currency),
    ),
  };
}
