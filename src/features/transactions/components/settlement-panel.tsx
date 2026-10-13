"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { settleTransactionAction } from "../actions/transaction.actions";
export function SettlementPanel({
  tenantId,
  transactionId,
  pending,
  accounts,
}: {
  tenantId: string;
  transactionId: string;
  pending: string;
  accounts: Array<{ id: string; name: string; currency?: string }>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const [amount, setAmount] = useState(pending);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(undefined);
    const result = await settleTransactionAction({
      tenantId,
      transactionId,
      accountId,
      amount,
      settledDate: date,
    });
    setBusy(false);
    if (result.error) setMessage(result.error);
    else router.refresh();
  }
  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5">
      <h2 className="text-lg font-bold">Liquidar</h2>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        Pendente: {pending}
      </p>
      <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-3">
        <input
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          inputMode="decimal"
          aria-label="Valor da liquidação"
          className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3"
        />
        <select
          value={accountId}
          onChange={(event) => setAccountId(event.target.value)}
          aria-label="Conta da liquidação"
          className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3"
        >
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
              {account.currency ? ` · ${account.currency}` : ""}
            </option>
          ))}
        </select>
        <input
          value={date}
          onChange={(event) => setDate(event.target.value)}
          type="date"
          aria-label="Data da liquidação"
          className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3"
        />
        <button
          disabled={busy || !accountId}
          className="min-h-10 rounded-[var(--radius-md)] bg-[var(--primary)] px-4 font-semibold text-white disabled:opacity-50 sm:col-span-3"
        >
          {busy ? "Liquidando…" : "Confirmar liquidação"}
        </button>
      </form>
      {message && (
        <p role="alert" className="mt-3 text-sm text-[var(--danger)]">
          {message}
        </p>
      )}
    </section>
  );
}
