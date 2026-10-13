"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { payCardInvoiceAction } from "@/features/card-purchases/actions/purchase.actions";

type Invoice = {
  id: string;
  card_id: string;
  invoice_cycle_id: string;
  total_amount: string | number;
  currency: string;
  status: string;
  paid_at: string | null;
};
type Installment = {
  id: string;
  purchase_id: string;
  invoice_id: string | null;
  amount: string | number;
  currency: string;
  installment_number: number;
  total_installments: number;
  competence_date: string;
  status: string;
};
type Purchase = { id: string; description: string; purchased_at: string };
type Cycle = {
  id: string;
  cycle_start: string;
  cycle_end: string;
  due_date: string;
  status: string;
};
type Account = {
  id: string;
  name: string;
  currency: string;
  is_active: boolean;
};
type Payment = {
  id: string;
  invoice_id: string;
  amount: string | number;
  currency: string;
  paid_at: string;
  reversed_at: string | null;
};

const money = (value: string | number, currency: string) =>
  `${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ${currency}`;
const date = (value: string) =>
  new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR");

function InvoiceStatus({ status }: { status: string }) {
  return (
    <span className="rounded-full border border-[var(--border)] px-2 py-1 text-xs font-semibold">
      {status === "paid" ? "Paga" : status === "closed" ? "Fechada" : "Aberta"}
    </span>
  );
}

export function CardDetails({
  tenantSlug,
  card,
  invoices,
  cycles,
  installments,
  purchases,
  payments,
}: {
  tenantSlug: string;
  card: {
    id: string;
    name: string;
    institution_name: string | null;
    currency: string;
    credit_limit: string | number;
    closing_day: number;
    due_day: number;
  };
  invoices: Invoice[];
  cycles: Cycle[];
  installments: Installment[];
  purchases: Purchase[];
  payments: Payment[];
}) {
  const cycleMap = new Map(cycles.map((cycle) => [cycle.id, cycle]));
  const purchaseMap = new Map(
    purchases.map((purchase) => [purchase.id, purchase]),
  );
  const used =
    invoices
      .filter((invoice) => invoice.status !== "paid")
      .reduce(
        (sum, invoice) =>
          sum +
          Number(invoice.total_amount) -
          payments
            .filter(
              (payment) =>
                payment.invoice_id === invoice.id && !payment.reversed_at,
            )
            .reduce((paid, payment) => paid + Number(payment.amount), 0),
        0,
      ) +
    installments
      .filter((installment) => !installment.invoice_id)
      .reduce((sum, installment) => sum + Number(installment.amount), 0);
  return (
    <div className="space-y-6">
      <section className="grid gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 sm:grid-cols-4">
        <div>
          <p className="text-sm text-[var(--text-secondary)]">Instituição</p>
          <p className="font-semibold">
            {card.institution_name || "Não informada"}
          </p>
        </div>
        <div>
          <p className="text-sm text-[var(--text-secondary)]">Limite total</p>
          <p className="font-semibold tabular-nums">
            {money(card.credit_limit, card.currency)}
          </p>
        </div>
        <div>
          <p className="text-sm text-[var(--text-secondary)]">
            Limite utilizado
          </p>
          <p className="font-semibold tabular-nums">
            {money(used, card.currency)}
          </p>
        </div>
        <div>
          <p className="text-sm text-[var(--text-secondary)]">Ciclo</p>
          <p className="font-semibold">
            Fecha dia {card.closing_day} · vence dia {card.due_day}
          </p>
        </div>
      </section>
      <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-lg font-bold">Faturas</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {invoices.map((invoice) => {
            const cycle = cycleMap.get(invoice.invoice_cycle_id);
            return (
              <Link
                key={invoice.id}
                href={`/t/${tenantSlug}/cards/${card.id}/invoices/${invoice.id}`}
                className="rounded-[var(--radius-md)] border border-[var(--border)] p-4 hover:border-[var(--primary)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <strong>
                    {cycle
                      ? `${date(cycle.cycle_start)} – ${date(cycle.cycle_end)}`
                      : "Ciclo"}
                  </strong>
                  <InvoiceStatus status={invoice.status} />
                </div>
                <p className="mt-2 text-2xl font-bold tabular-nums">
                  {money(invoice.total_amount, invoice.currency)}
                </p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Vencimento: {cycle ? date(cycle.due_date) : "—"}
                </p>
              </Link>
            );
          })}
          {invoices.length === 0 && (
            <p className="text-sm text-[var(--text-secondary)]">
              Nenhuma fatura gerada para este cartão.
            </p>
          )}
        </div>
      </section>
      <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-lg font-bold">Parcelas futuras</h2>
        <div className="mt-3 divide-y divide-[var(--border)]">
          {installments.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
            >
              <span>
                {purchaseMap.get(item.purchase_id)?.description ?? "Compra"} ·{" "}
                {item.installment_number}/{item.total_installments}
              </span>
              <span className="tabular-nums">
                {money(item.amount, item.currency)} ·{" "}
                {date(item.competence_date)}
              </span>
            </div>
          ))}
          {installments.length === 0 && (
            <p className="text-sm text-[var(--text-secondary)]">
              Nenhuma parcela futura.
            </p>
          )}
        </div>
      </section>
      <Link
        href={`/t/${tenantSlug}/cards`}
        className="inline-flex min-h-10 items-center rounded-[var(--radius-md)] border border-[var(--border)] px-4 text-sm font-semibold"
      >
        Voltar para cartões
      </Link>
    </div>
  );
}

export function InvoiceDetails({
  tenantSlug,
  tenantId,
  invoice,
  cycle,
  installments,
  purchases,
  payments,
  accounts,
  canManage,
}: {
  tenantSlug: string;
  tenantId: string;
  invoice: Invoice;
  cycle: Cycle | null;
  installments: Installment[];
  purchases: Purchase[];
  payments: Payment[];
  accounts: Account[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(String(invoice.total_amount));
  const [accountId, setAccountId] = useState(
    accounts.find((account) => account.currency === invoice.currency)?.id ?? "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const purchaseMap = new Map(
    purchases.map((purchase) => [purchase.id, purchase]),
  );
  const paid = payments
    .filter((payment) => !payment.reversed_at)
    .reduce((sum, payment) => sum + Number(payment.amount), 0);
  const pending = Math.max(0, Number(invoice.total_amount) - paid);
  async function pay() {
    setBusy(true);
    setError(undefined);
    const result = await payCardInvoiceAction({
      tenantId,
      invoiceId: invoice.id,
      accountId,
      amount,
      paidAt: new Date().toISOString(),
    });
    setBusy(false);
    if (result.error) setError(result.error);
    else router.refresh();
  }
  return (
    <div className="space-y-6">
      <section className="grid gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 sm:grid-cols-4">
        <div>
          <p className="text-sm text-[var(--text-secondary)]">Período</p>
          <p className="font-semibold">
            {cycle
              ? `${date(cycle.cycle_start)} – ${date(cycle.cycle_end)}`
              : "—"}
          </p>
        </div>
        <div>
          <p className="text-sm text-[var(--text-secondary)]">Vencimento</p>
          <p className="font-semibold">{cycle ? date(cycle.due_date) : "—"}</p>
        </div>
        <div>
          <p className="text-sm text-[var(--text-secondary)]">Total</p>
          <p className="font-semibold tabular-nums">
            {money(invoice.total_amount, invoice.currency)}
          </p>
        </div>
        <div>
          <p className="text-sm text-[var(--text-secondary)]">Pendente</p>
          <p className="font-semibold tabular-nums">
            {money(pending, invoice.currency)}
          </p>
        </div>
      </section>
      {canManage && invoice.status !== "paid" && pending > 0 && (
        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-lg font-bold">Pagar fatura</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="grid gap-1 text-sm font-semibold">
              Valor
              <input
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                inputMode="decimal"
                className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Conta pagadora
              <select
                value={accountId}
                onChange={(event) => setAccountId(event.target.value)}
                className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
              >
                <option value="">Selecione</option>
                {accounts
                  .filter(
                    (account) =>
                      account.is_active &&
                      account.currency === invoice.currency,
                  )
                  .map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
              </select>
            </label>
            <button
              type="button"
              disabled={busy || !accountId}
              onClick={pay}
              className="min-h-10 self-end rounded-[var(--radius-md)] bg-[var(--primary)] px-4 font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Processando…" : "Registrar pagamento"}
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-3 text-sm text-[var(--danger)]">
              {error}
            </p>
          )}
        </section>
      )}
      <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-lg font-bold">Parcelas associadas</h2>
        <div className="mt-3 divide-y divide-[var(--border)]">
          {installments.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap justify-between gap-3 py-3 text-sm"
            >
              <span>
                {purchaseMap.get(item.purchase_id)?.description ?? "Compra"} ·{" "}
                {item.installment_number}/{item.total_installments}
              </span>
              <span className="tabular-nums">
                {money(item.amount, item.currency)}
              </span>
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-lg font-bold">Histórico de pagamentos</h2>
        <div className="mt-3 divide-y divide-[var(--border)]">
          {payments.map((payment) => (
            <div
              key={payment.id}
              className="flex flex-wrap justify-between gap-3 py-3 text-sm"
            >
              <span>
                {date(payment.paid_at)}
                {payment.reversed_at ? " · Estornado" : ""}
              </span>
              <span className="tabular-nums">
                {money(payment.amount, payment.currency)}
              </span>
            </div>
          ))}
          {payments.length === 0 && (
            <p className="text-sm text-[var(--text-secondary)]">
              Nenhum pagamento registrado.
            </p>
          )}
        </div>
      </section>
      <Link
        href={`/t/${tenantSlug}/cards/${invoice.card_id}`}
        className="inline-flex min-h-10 items-center rounded-[var(--radius-md)] border border-[var(--border)] px-4 text-sm font-semibold"
      >
        Voltar para o cartão
      </Link>
    </div>
  );
}
