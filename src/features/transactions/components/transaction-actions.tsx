"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  cancelTransactionAction,
  reverseSettlementAction,
} from "../actions/transaction.actions";
export function TransactionActions({
  tenantId,
  id,
}: {
  tenantId: string;
  id: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);
  async function cancel() {
    if (!window.confirm("Cancelar esta transação?")) return;
    setBusy(true);
    const result = await cancelTransactionAction({ tenantId, id });
    setBusy(false);
    if (result.error) setMessage(result.error);
    else router.refresh();
  }
  return (
    <>
      {message && (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {message}
        </p>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={cancel}
        className="min-h-10 rounded-[var(--radius-md)] border border-[var(--danger)] px-3 text-sm text-[var(--danger)]"
      >
        {busy ? "Cancelando…" : "Cancelar"}
      </button>
    </>
  );
}

export function SettlementActions({
  tenantId,
  settlementId,
}: {
  tenantId: string;
  settlementId: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);
  async function reverse() {
    if (
      !window.confirm("Reverter esta liquidação? O movimento será compensado.")
    )
      return;
    setBusy(true);
    setMessage(undefined);
    const result = await reverseSettlementAction({ tenantId, settlementId });
    setBusy(false);
    if (result.error) setMessage(result.error);
    else router.refresh();
  }
  return (
    <span className="inline-flex items-center gap-2">
      {message && (
        <span role="alert" className="text-sm text-[var(--danger)]">
          {message}
        </span>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={reverse}
        className="min-h-9 rounded-[var(--radius-md)] border border-[var(--danger)] px-3 text-sm text-[var(--danger)]"
      >
        {busy ? "Revertendo…" : "Reverter"}
      </button>
    </span>
  );
}
