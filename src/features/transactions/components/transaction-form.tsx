"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  createTransactionAction,
  updateTransactionAction,
} from "../actions/transaction.actions";
import {
  transactionSchema,
  type TransactionInput,
} from "../schemas/transaction.schema";

type Option = { id: string; name: string; type?: string; currency?: string };
type Transaction = TransactionInput & { id: string };
export function TransactionForm({
  tenantId,
  tenantSlug,
  initial,
  categories,
  accounts,
  people,
  costCenters,
}: {
  tenantId: string;
  tenantSlug: string;
  initial?: Transaction;
  categories: Option[];
  accounts: Option[];
  people: Option[];
  costCenters: Option[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const form = useForm<TransactionInput>({
    resolver: zodResolver(transactionSchema),
    defaultValues: initial ?? {
      tenantId,
      type: "expense",
      description: "",
      amount: "",
      currency: "BRL",
      categoryId: "",
      personId: "",
      costCenterId: "",
      accountId: "",
      competenceDate: today,
      dueDate: "",
      status: "pending",
      notes: "",
    },
  });
  const type = form.watch("type");
  const filteredCategories = categories.filter(
    (item) => !item.type || item.type === type,
  );
  async function submit(values: TransactionInput) {
    setBusy(true);
    setMessage(undefined);
    const normalized = {
      ...values,
      categoryId: values.categoryId || null,
      personId: values.personId || null,
      costCenterId: values.costCenterId || null,
      accountId: values.accountId || null,
      dueDate: values.dueDate || null,
    };
    const result = initial
      ? await updateTransactionAction({ ...normalized, id: initial.id })
      : await createTransactionAction(normalized);
    setBusy(false);
    if (result.error) setMessage(result.error);
    else router.push(`/t/${tenantSlug}/transactions`);
  }
  return (
    <form
      onSubmit={form.handleSubmit(submit)}
      className="grid gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 sm:grid-cols-2"
    >
      <label className="grid gap-1 text-sm font-semibold">
        Tipo
        <select
          {...form.register("type")}
          className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
        >
          <option value="expense">Despesa</option>
          <option value="income">Receita</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm font-semibold">
        Status
        <select
          {...form.register("status")}
          className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
        >
          <option value="pending">Pendente</option>
          <option value="planned">Prevista</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm font-semibold sm:col-span-2">
        Descrição
        <input
          {...form.register("description")}
          className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
        />
        {form.formState.errors.description && (
          <span className="font-normal text-[var(--danger)]">
            {form.formState.errors.description.message}
          </span>
        )}
      </label>
      <label className="grid gap-1 text-sm font-semibold">
        Valor
        <input
          {...form.register("amount")}
          inputMode="decimal"
          placeholder="0,00"
          className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
        />
        {form.formState.errors.amount && (
          <span className="font-normal text-[var(--danger)]">
            {form.formState.errors.amount.message}
          </span>
        )}
      </label>
      <label className="grid gap-1 text-sm font-semibold">
        Moeda
        <input
          {...form.register("currency")}
          maxLength={3}
          className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal uppercase"
        />
        {form.formState.errors.currency && (
          <span className="font-normal text-[var(--danger)]">
            {form.formState.errors.currency.message}
          </span>
        )}
      </label>
      <label className="grid gap-1 text-sm font-semibold">
        Categoria
        <select
          {...form.register("categoryId")}
          className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
        >
          <option value="">Sem categoria</option>
          {filteredCategories.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm font-semibold">
        Conta
        <select
          {...form.register("accountId")}
          className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
        >
          <option value="">Sem conta definida</option>
          {accounts.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
              {item.currency ? ` · ${item.currency}` : ""}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm font-semibold">
        Responsável
        <select
          {...form.register("personId")}
          className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
        >
          <option value="">Sem responsável</option>
          {people.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm font-semibold">
        Centro de custo
        <select
          {...form.register("costCenterId")}
          className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
        >
          <option value="">Sem centro de custo</option>
          {costCenters.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm font-semibold">
        Competência
        <input
          {...form.register("competenceDate")}
          type="date"
          className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
        />
        {form.formState.errors.competenceDate && (
          <span className="font-normal text-[var(--danger)]">
            {form.formState.errors.competenceDate.message}
          </span>
        )}
      </label>
      <label className="grid gap-1 text-sm font-semibold">
        Vencimento (opcional)
        <input
          {...form.register("dueDate")}
          type="date"
          className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
        />
        {form.formState.errors.dueDate && (
          <span className="font-normal text-[var(--danger)]">
            {form.formState.errors.dueDate.message}
          </span>
        )}
      </label>
      <label className="grid gap-1 text-sm font-semibold sm:col-span-2">
        Observações
        <textarea
          {...form.register("notes")}
          rows={3}
          className="rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 py-2 font-normal"
        />
      </label>
      {message && (
        <p role="alert" className="text-sm text-[var(--danger)] sm:col-span-2">
          {message}
        </p>
      )}
      <button
        disabled={busy}
        className="min-h-10 rounded-[var(--radius-md)] bg-[var(--primary)] px-4 font-semibold text-white disabled:opacity-50 sm:col-span-2"
      >
        {busy
          ? "Salvando…"
          : initial
            ? "Salvar alterações"
            : "Criar lançamento"}
      </button>
    </form>
  );
}
