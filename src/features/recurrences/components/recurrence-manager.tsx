"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createRecurrenceAction,
  generateRecurrencesAction,
  setRecurrenceStateAction,
  updateRecurrenceAction,
} from "../actions/recurrence.actions";
import {
  recurrenceSchema,
  type RecurrenceInput,
} from "../schemas/recurrence.schema";

type Rule = {
  id: string;
  type: string;
  frequency: string;
  interval_count: number;
  start_date: string;
  end_date: string | null;
  max_occurrences: number | null;
  generated_count: number;
  next_run_at: string;
  amount: string | number;
  currency: string;
  description: string;
  category_id: string | null;
  person_id: string | null;
  cost_center_id: string | null;
  account_id: string | null;
  is_active: boolean;
  cancelled_at: string | null;
};
type Option = {
  id: string;
  name: string;
  type?: string;
  currency?: string;
  is_active?: boolean;
};
const frequencyLabels = {
  daily: "Diária",
  weekly: "Semanal",
  monthly: "Mensal",
};
const emptyValues = (tenantId: string): RecurrenceInput => ({
  tenantId,
  type: "expense",
  frequency: "monthly",
  interval: 1,
  startDate: new Date().toISOString().slice(0, 10),
  endDate: "",
  maxOccurrences: "",
  amount: "",
  currency: "BRL",
  description: "",
  categoryId: "",
  personId: "",
  costCenterId: "",
  accountId: "",
});

export function RecurrenceManager({
  tenantId,
  rules,
  categories,
  accounts,
  people,
  costCenters,
  currencies,
  canManage,
}: {
  tenantId: string;
  rules: Rule[];
  categories: Option[];
  accounts: Option[];
  people: Option[];
  costCenters: Option[];
  currencies: string[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);
  const form = useForm<RecurrenceInput>({
    resolver: zodResolver(recurrenceSchema),
    defaultValues: emptyValues(tenantId),
  });
  const type = useWatch({ control: form.control, name: "type" });
  const visibleCategories = categories.filter(
    (item) => item.type === type && item.is_active !== false,
  );
  const activeAccounts = accounts.filter((item) => item.is_active !== false);
  async function submit(values: RecurrenceInput) {
    setBusy(true);
    setMessage(undefined);
    const result = editingId
      ? await updateRecurrenceAction({ ...values, id: editingId })
      : await createRecurrenceAction(values);
    setBusy(false);
    if (result.error) setMessage(result.error);
    else {
      form.reset(emptyValues(tenantId));
      setEditingId(undefined);
      router.refresh();
    }
  }
  function edit(rule: Rule) {
    setEditingId(rule.id);
    form.reset({
      tenantId,
      type: rule.type as "income" | "expense",
      frequency: rule.frequency as "daily" | "weekly" | "monthly",
      interval: rule.interval_count,
      startDate: rule.start_date,
      endDate: rule.end_date ?? "",
      maxOccurrences: rule.max_occurrences ?? "",
      amount: String(rule.amount),
      currency: rule.currency,
      description: rule.description,
      categoryId: rule.category_id ?? "",
      personId: rule.person_id ?? "",
      costCenterId: rule.cost_center_id ?? "",
      accountId: rule.account_id ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function state(id: string, action: "pause" | "resume" | "cancel") {
    if (
      action === "cancel" &&
      !window.confirm("Cancelar esta recorrência? O histórico será preservado.")
    )
      return;
    const result = await setRecurrenceStateAction({ tenantId, id, action });
    if (result.error) setMessage(result.error);
    else router.refresh();
  }
  async function generate() {
    setBusy(true);
    setMessage(undefined);
    const result = await generateRecurrencesAction({ tenantId });
    setBusy(false);
    setMessage(result.error ?? `${result.generated} ocorrência(s) gerada(s).`);
    if (!result.error) router.refresh();
  }
  return (
    <div className="space-y-6">
      {canManage && (
        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold">
              {editingId ? "Editar recorrência" : "Nova recorrência"}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(undefined);
                  form.reset(emptyValues(tenantId));
                }}
                className="text-sm text-[var(--text-secondary)]"
              >
                Cancelar edição
              </button>
            )}
          </div>
          <form
            onSubmit={form.handleSubmit(submit)}
            className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
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
              Periodicidade
              <select
                {...form.register("frequency")}
                className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
              >
                <option value="daily">Diária</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensal</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              A cada
              <input
                type="number"
                min="1"
                max="365"
                {...form.register("interval", { valueAsNumber: true })}
                className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Descrição
              <input
                {...form.register("description")}
                className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Valor
              <input
                inputMode="decimal"
                {...form.register("amount")}
                className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Moeda
              <select
                {...form.register("currency")}
                className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
              >
                {currencies.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Início
              <input
                type="date"
                {...form.register("startDate")}
                className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Fim (opcional)
              <input
                type="date"
                {...form.register("endDate")}
                className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Máximo de ocorrências
              <input
                type="number"
                min="1"
                max="1000"
                {...form.register("maxOccurrences", {
                  setValueAs: (value) => (value === "" ? "" : Number(value)),
                })}
                className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Categoria
              <select
                {...form.register("categoryId")}
                className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
              >
                <option value="">Sem categoria</option>
                {visibleCategories.map((item) => (
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
                <option value="">Sem conta</option>
                {activeAccounts.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.currency})
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
                {people
                  .filter((item) => item.is_active !== false)
                  .map((item) => (
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
                <option value="">Sem centro</option>
                {costCenters
                  .filter((item) => item.is_active !== false)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </select>
            </label>
            {message && (
              <p className="text-sm text-[var(--text-secondary)] sm:col-span-2 lg:col-span-3">
                {message}
              </p>
            )}
            <button
              disabled={busy}
              className="min-h-10 rounded-[var(--radius-md)] bg-[var(--primary)] px-4 font-semibold text-white disabled:opacity-60 sm:col-span-2 lg:col-span-3"
            >
              {busy
                ? "Salvando…"
                : editingId
                  ? "Salvar alterações"
                  : "Criar recorrência"}
            </button>
          </form>
        </section>
      )}
      <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Regras cadastradas</h2>
          {canManage && (
            <button
              type="button"
              disabled={busy}
              onClick={generate}
              className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] px-3 text-sm font-semibold"
            >
              Gerar ocorrências até hoje
            </button>
          )}
        </div>
        {rules.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--text-secondary)]">
            Nenhuma recorrência cadastrada.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--border)] p-3 text-sm"
              >
                <div>
                  <p className="font-semibold">
                    {rule.description} · {rule.currency}{" "}
                    {Number(rule.amount).toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                  <p className="text-[var(--text-secondary)]">
                    {
                      frequencyLabels[
                        rule.frequency as keyof typeof frequencyLabels
                      ]
                    }{" "}
                    · próxima:{" "}
                    {new Date(
                      `${rule.next_run_at}T12:00:00`,
                    ).toLocaleDateString("pt-BR")}{" "}
                    · {rule.generated_count} gerada(s)
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={
                      rule.is_active
                        ? "text-[var(--success)]"
                        : "text-[var(--text-secondary)]"
                    }
                  >
                    {rule.cancelled_at
                      ? "Cancelada"
                      : rule.is_active
                        ? "Ativa"
                        : "Pausada"}
                  </span>
                  {canManage && !rule.cancelled_at && (
                    <>
                      <button
                        type="button"
                        onClick={() => edit(rule)}
                        className="text-[var(--primary)]"
                      >
                        Editar
                      </button>
                      {rule.is_active ? (
                        <button
                          type="button"
                          onClick={() => state(rule.id, "pause")}
                          className="text-[var(--text-secondary)]"
                        >
                          Pausar
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => state(rule.id, "resume")}
                          className="text-[var(--primary)]"
                        >
                          Retomar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => state(rule.id, "cancel")}
                        className="text-[var(--danger)]"
                      >
                        Cancelar
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
