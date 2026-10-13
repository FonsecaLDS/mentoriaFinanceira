"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createTransferAction,
  reverseTransferAction,
} from "../actions/transfer.actions";
import { transferSchema, type TransferInput } from "../schemas/transfer.schema";

type Account = {
  id: string;
  name: string;
  currency: string;
  is_active: boolean;
};
type Transfer = {
  id: string;
  source_account_id: string;
  target_account_id: string;
  amount: string | number;
  currency: string;
  effective_at: string;
  description: string | null;
  reversed_at: string | null;
};
export function TransferManager({
  tenantId,
  accounts,
  transfers,
  canManage,
}: {
  tenantId: string;
  accounts: Account[];
  transfers: Transfer[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const form = useForm<TransferInput>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      tenantId,
      sourceAccountId: "",
      targetAccountId: "",
      amount: "",
      currency: "BRL",
      effectiveDate: today,
      description: "",
    },
  });
  async function submit(values: TransferInput) {
    setBusy(true);
    setMessage(undefined);
    const result = await createTransferAction(values);
    setBusy(false);
    if (result.error) setMessage(result.error);
    else {
      form.reset({ ...values, amount: "", description: "" });
      router.refresh();
    }
  }
  async function reverse(transfer: Transfer) {
    if (
      !window.confirm(
        "Reverter esta transferência? Dois movimentos compensatórios serão registrados.",
      )
    )
      return;
    const result = await reverseTransferAction({
      tenantId,
      transferId: transfer.id,
    });
    if (result.error) setMessage(result.error);
    else router.refresh();
  }
  const activeAccounts = accounts.filter((account) => account.is_active);
  return (
    <div className="space-y-6">
      {canManage && (
        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-lg font-bold">Nova transferência</h2>
          <form
            onSubmit={form.handleSubmit(submit)}
            className="mt-4 grid gap-4 sm:grid-cols-2"
          >
            <label className="grid gap-1 text-sm font-semibold">
              Origem
              <select
                {...form.register("sourceAccountId")}
                className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
              >
                <option value="">Selecione</option>
                {activeAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.currency})
                  </option>
                ))}
              </select>
              {form.formState.errors.sourceAccountId && (
                <span className="font-normal text-[var(--danger)]">
                  {form.formState.errors.sourceAccountId.message}
                </span>
              )}
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Destino
              <select
                {...form.register("targetAccountId")}
                className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
              >
                <option value="">Selecione</option>
                {activeAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.currency})
                  </option>
                ))}
              </select>
              {form.formState.errors.targetAccountId && (
                <span className="font-normal text-[var(--danger)]">
                  {form.formState.errors.targetAccountId.message}
                </span>
              )}
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Valor
              <input
                {...form.register("amount")}
                inputMode="decimal"
                className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
              />
              {form.formState.errors.amount && (
                <span className="font-normal text-[var(--danger)]">
                  {form.formState.errors.amount.message}
                </span>
              )}
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Data
              <input
                {...form.register("effectiveDate")}
                type="date"
                className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
              />
              {form.formState.errors.effectiveDate && (
                <span className="font-normal text-[var(--danger)]">
                  {form.formState.errors.effectiveDate.message}
                </span>
              )}
            </label>
            <label className="grid gap-1 text-sm font-semibold sm:col-span-2">
              Descrição (opcional)
              <input
                {...form.register("description")}
                className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
              />
            </label>
            {message && (
              <p className="text-sm text-[var(--danger)] sm:col-span-2">
                {message}
              </p>
            )}
            <button
              disabled={busy}
              className="min-h-10 rounded-[var(--radius-md)] bg-[var(--primary)] px-4 font-semibold text-white disabled:opacity-60 sm:col-span-2"
            >
              {busy ? "Registrando…" : "Registrar transferência"}
            </button>
          </form>
        </section>
      )}
      <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-lg font-bold">Histórico</h2>
        {transfers.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--text-secondary)]">
            Nenhuma transferência registrada.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {transfers.map((t) => {
              const source =
                accounts.find((a) => a.id === t.source_account_id)?.name ??
                "Conta";
              const target =
                accounts.find((a) => a.id === t.target_account_id)?.name ??
                "Conta";
              return (
                <div
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--border)] p-3 text-sm"
                >
                  <div>
                    <p className="font-semibold">
                      {source} → {target}
                    </p>
                    <p className="text-[var(--text-secondary)]">
                      {new Date(t.effective_at).toLocaleDateString("pt-BR")}{" "}
                      {t.description ? `· ${t.description}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">
                      {t.currency}{" "}
                      {Number(t.amount).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                    {t.reversed_at ? (
                      <span className="text-[var(--text-secondary)]">
                        Revertida
                      </span>
                    ) : (
                      canManage && (
                        <button
                          onClick={() => reverse(t)}
                          className="text-[var(--danger)]"
                        >
                          Reverter
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
