"use client";

import { usePathname, useRouter } from "next/navigation";
import { CashFlowChart } from "./cash-flow-chart";

type Summary = {
  currency: string;
  cash_income: string | number;
  cash_expense: string | number;
  cash_result: string | number;
  accrual_income: string | number;
  accrual_expense: string | number;
  accrual_result: string | number;
  current_balance: string | number;
  projected_balance: string | number;
  restricted_balance: string | number;
  available_balance: string | number;
  receivables: string | number;
  payables: string | number;
};
type DashboardData = {
  summary: Summary[];
  balances: Array<{
    account_id: string;
    account_name: string;
    account_type: string;
    currency: string;
    balance: string | number;
    is_restricted: boolean;
  }>;
  payments: Array<{
    id: string;
    description: string;
    amount: string | number;
    currency: string;
    type: string;
    status: string;
    due_date: string | null;
  }>;
  invoices: Array<{
    id: string;
    card_name: string;
    total_amount: string | number;
    currency: string;
    status: string;
    due_date: string | null;
  }>;
  goals: Array<{
    id: string;
    name: string;
    target_amount: string | number;
    currency: string;
    reserved_amount: string;
    reserve_name: string | null;
    status: string;
  }>;
  series: Array<{
    period_start: string;
    currency: string;
    income: string | number;
    expense: string | number;
    result: string | number;
    cumulative_result: string | number;
  }>;
};

const money = (value: string | number, currency: string) =>
  `${currency} ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
const date = (value: string | null) =>
  value
    ? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR")
    : "Sem data";

export function DashboardView({
  month,
  regime,
  currency,
  accountId,
  granularity,
  data,
}: {
  tenantSlug: string;
  month: string;
  regime: "cash" | "competence";
  currency?: string;
  accountId?: string;
  granularity: "day" | "week" | "month";
  data: DashboardData;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const query = (next: Record<string, string | undefined>) => {
    const params = new URLSearchParams({
      month,
      regime,
      ...(currency ? { currency } : {}),
      ...(accountId ? { accountId } : {}),
      granularity,
      ...next,
    });
    Object.entries(next).forEach(([key, value]) => {
      if (value === undefined) params.delete(key);
    });
    router.push(`${pathname}?${params}`);
  };
  const visibleSummary = data.summary.filter(
    (item) => !currency || item.currency === currency,
  );
  const primary = visibleSummary[0];
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4">
        <label className="grid gap-1 text-sm font-semibold">
          Período
          <input
            type="month"
            value={month}
            onChange={(event) => query({ month: event.target.value })}
            className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Regime
          <select
            value={regime}
            onChange={(event) => query({ regime: event.target.value })}
            className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
          >
            <option value="cash">Caixa</option>
            <option value="competence">Competência</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Moeda
          <select
            value={currency ?? "all"}
            onChange={(event) =>
              query({
                currency:
                  event.target.value === "all" ? undefined : event.target.value,
              })
            }
            className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
          >
            <option value="all">Todas</option>
            {[...new Set(data.summary.map((item) => item.currency))].map(
              (item) => (
                <option key={item}>{item}</option>
              ),
            )}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Conta
          <select
            value={accountId ?? "all"}
            onChange={(event) =>
              query({
                accountId:
                  event.target.value === "all" ? undefined : event.target.value,
              })
            }
            className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
          >
            <option value="all">Todas</option>
            {data.balances.map((account) => (
              <option key={account.account_id} value={account.account_id}>
                {account.account_name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Agrupamento
          <select
            value={granularity}
            onChange={(event) => query({ granularity: event.target.value })}
            className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
          >
            <option value="day">Diário</option>
            <option value="week">Semanal</option>
            <option value="month">Mensal</option>
          </select>
        </label>
      </div>
      <CashFlowChart
        series={data.series}
        currency={currency}
        granularity={granularity}
      />
      {!primary ? (
        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--text-secondary)]">
          Nenhum dado financeiro neste período.
        </section>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              title="Saldo disponível"
              value={money(primary.available_balance, primary.currency)}
              hint="Exclui recursos restritos"
            />
            <Kpi
              title="Receitas"
              value={money(
                regime === "cash"
                  ? primary.cash_income
                  : primary.accrual_income,
                primary.currency,
              )}
              hint={
                regime === "cash" ? "Regime de caixa" : "Regime de competência"
              }
            />
            <Kpi
              title="Despesas"
              value={money(
                regime === "cash"
                  ? primary.cash_expense
                  : primary.accrual_expense,
                primary.currency,
              )}
              hint={
                regime === "cash" ? "Regime de caixa" : "Regime de competência"
              }
            />
            <Kpi
              title="Saldo projetado"
              value={money(primary.projected_balance, primary.currency)}
              hint="Inclui previstos"
            />
          </section>
          <section className="grid gap-4 lg:grid-cols-2">
            <Panel title="Resultado do período">
              <div className="grid gap-3 sm:grid-cols-3">
                <Metric
                  label="Resultado"
                  value={money(
                    regime === "cash"
                      ? primary.cash_result
                      : primary.accrual_result,
                    primary.currency,
                  )}
                />
                <Metric
                  label="A receber"
                  value={money(primary.receivables, primary.currency)}
                />
                <Metric
                  label="A pagar"
                  value={money(primary.payables, primary.currency)}
                />
              </div>
            </Panel>
            <Panel title="Saldos por conta">
              <div className="divide-y divide-[var(--border)]">
                {data.balances.map((account) => (
                  <div
                    key={account.account_id}
                    className="flex justify-between gap-3 py-2 text-sm"
                  >
                    <span>
                      {account.account_name}
                      {account.is_restricted ? " · restrita" : ""}
                    </span>
                    <strong className="tabular-nums">
                      {money(account.balance, account.currency)}
                    </strong>
                  </div>
                ))}
              </div>
            </Panel>
          </section>
        </>
      )}
      <section className="grid gap-4 lg:grid-cols-3">
        <Panel title="Próximos vencimentos">
          {data.payments.length === 0 ? (
            <Empty text="Nenhum vencimento no período." />
          ) : (
            data.payments.map((item) => (
              <div
                key={item.id}
                className="flex justify-between gap-3 border-b border-[var(--border)] py-2 text-sm last:border-0"
              >
                <span>
                  {item.description}
                  <small className="block text-[var(--text-secondary)]">
                    {date(item.due_date)} · {item.status}
                  </small>
                </span>
                <strong className="tabular-nums">
                  {money(item.amount, item.currency)}
                </strong>
              </div>
            ))
          )}
        </Panel>
        <Panel title="Faturas abertas">
          {data.invoices.length === 0 ? (
            <Empty text="Nenhuma fatura pendente." />
          ) : (
            data.invoices.map((item) => (
              <div
                key={item.id}
                className="flex justify-between gap-3 border-b border-[var(--border)] py-2 text-sm last:border-0"
              >
                <span>
                  {item.card_name}
                  <small className="block text-[var(--text-secondary)]">
                    {date(item.due_date)} · {item.status}
                  </small>
                </span>
                <strong className="tabular-nums">
                  {money(item.total_amount, item.currency)}
                </strong>
              </div>
            ))
          )}
        </Panel>
        <Panel title="Metas e reservas">
          {data.goals.length === 0 ? (
            <Empty text="Nenhuma meta cadastrada." />
          ) : (
            data.goals.map((goal) => {
              const progress = Math.min(
                100,
                Math.max(
                  0,
                  (Number(goal.reserved_amount) / Number(goal.target_amount)) *
                    100,
                ),
              );
              return (
                <div
                  key={goal.id}
                  className="border-b border-[var(--border)] py-2 last:border-0"
                >
                  <div className="flex justify-between gap-3 text-sm">
                    <span>{goal.name}</span>
                    <strong>{progress.toFixed(0)}%</strong>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--border)]">
                    <div
                      className="h-full bg-[var(--primary)]"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <small className="text-[var(--text-secondary)]">
                    {money(goal.reserved_amount, goal.currency)} de{" "}
                    {money(goal.target_amount, goal.currency)}
                  </small>
                </div>
              );
            })
          )}
        </Panel>
      </section>
    </div>
  );
}

function Kpi({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-sm text-[var(--text-secondary)]">{title}</p>
      <p className="mt-2 text-xl font-bold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-[var(--text-secondary)]">{hint}</p>
    </div>
  );
}
function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5">
      <h2 className="font-bold">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[var(--text-secondary)]">{label}</p>
      <p className="mt-1 font-semibold tabular-nums">{value}</p>
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return <p className="text-sm text-[var(--text-secondary)]">{text}</p>;
}
