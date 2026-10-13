"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  removeBudgetAction,
  upsertBudgetAction,
} from "../actions/budget.actions";
import { budgetSchema, type BudgetInput } from "../schemas/budget.schema";

type Budget = {
  budget_id: string;
  category_id: string;
  category_name: string;
  currency: string;
  limit_amount: string | number;
  spent: string | number;
  remaining: string | number;
  usage_percentage: string | number;
  variance: string | number;
  alert_level: string;
};
type Category = {
  id: string;
  name: string;
  type: string;
  parent_id: string | null;
};
function money(value: string | number, currency: string) {
  return `${currency} ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}
export function BudgetManager({
  tenantId,
  year,
  month,
  regime,
  budgets,
  categories,
  currencies,
  canManage,
}: {
  tenantId: string;
  year: number;
  month: number;
  regime: "competence" | "cash";
  budgets: Budget[];
  categories: Category[];
  currencies: string[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);
  const form = useForm<BudgetInput>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      tenantId,
      categoryId: "",
      year,
      month,
      currency: currencies[0] ?? "BRL",
      limitAmount: "",
    },
  });
  function changeMonth(value: string) {
    const [nextYear, nextMonth] = value.split("-").map(Number);
    if (nextYear && nextMonth)
      router.push(
        `/t/${location.pathname.split("/")[2]}/budgets?month=${value}&regime=${regime}`,
      );
  }
  function changeRegime(value: string) {
    router.push(
      `?month=${year}-${String(month).padStart(2, "0")}&regime=${value}`,
    );
  }
  async function submit(values: BudgetInput) {
    setBusy(true);
    setMessage(undefined);
    const result = await upsertBudgetAction(values);
    setBusy(false);
    if (result.error) setMessage(result.error);
    else {
      form.reset({ ...values, limitAmount: "" });
      router.refresh();
    }
  }
  async function remove(budget: Budget) {
    if (!window.confirm(`Remover o limite de ${budget.category_name}?`)) return;
    const result = await removeBudgetAction({
      tenantId,
      budgetId: budget.budget_id,
    });
    if (result.error) setMessage(result.error);
    else router.refresh();
  }
  const leafExpenses = categories.filter(
    (category) =>
      category.type === "expense" &&
      !categories.some(
        (child) => child.parent_id === category.id && child.type === "expense",
      ),
  );
  const totals = budgets.reduce<
    Record<string, { limit: number; spent: number }>
  >((acc, budget) => {
    const current = acc[budget.currency] ?? { limit: 0, spent: 0 };
    acc[budget.currency] = {
      limit: current.limit + Number(budget.limit_amount),
      spent: current.spent + Number(budget.spent),
    };
    return acc;
  }, {});
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4">
        <label className="grid gap-1 text-sm font-semibold">
          Mês
          <input
            type="month"
            value={`${year}-${String(month).padStart(2, "0")}`}
            onChange={(e) => changeMonth(e.target.value)}
            className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Regime
          <select
            value={regime}
            onChange={(e) => changeRegime(e.target.value)}
            className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
          >
            <option value="competence">Competência</option>
            <option value="cash">Caixa</option>
          </select>
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(totals).map(([currency, total]) => (
          <div
            key={currency}
            className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4"
          >
            <p className="text-xs text-[var(--text-secondary)] uppercase">
              {currency} · limites
            </p>
            <p className="mt-2 text-xl font-bold">
              {money(total.limit, currency)}
            </p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Consumo: {money(total.spent, currency)}
            </p>
          </div>
        ))}
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-xs text-[var(--text-secondary)] uppercase">
            Categorias em alerta
          </p>
          <p className="mt-2 text-xl font-bold">
            {budgets.filter((budget) => budget.alert_level !== "normal").length}
          </p>
        </div>
      </div>
      {canManage && (
        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-lg font-bold">Definir limite</h2>
          <form
            onSubmit={form.handleSubmit(submit)}
            className="mt-4 grid gap-4 sm:grid-cols-3"
          >
            <label className="grid gap-1 text-sm font-semibold">
              Categoria
              <select
                {...form.register("categoryId")}
                className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
              >
                <option value="">Selecione</option>
                {leafExpenses.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Moeda
              <select
                {...form.register("currency")}
                className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
              >
                {currencies.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Limite mensal
              <input
                {...form.register("limitAmount")}
                inputMode="decimal"
                className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
              />
              {form.formState.errors.limitAmount && (
                <span className="font-normal text-[var(--danger)]">
                  {form.formState.errors.limitAmount.message}
                </span>
              )}
            </label>
            {message && (
              <p className="text-sm text-[var(--danger)] sm:col-span-3">
                {message}
              </p>
            )}
            <button
              disabled={busy}
              className="min-h-10 rounded-[var(--radius-md)] bg-[var(--primary)] px-4 font-semibold text-white disabled:opacity-60 sm:col-span-3"
            >
              {busy ? "Salvando…" : "Salvar limite"}
            </button>
          </form>
        </section>
      )}
      <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-lg font-bold">Acompanhamento</h2>
        {budgets.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--text-secondary)]">
            Nenhum limite cadastrado neste período.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {budgets.map((budget) => {
              const percent = Number(budget.usage_percentage);
              const width = Math.min(Math.max(percent, 0), 100);
              return (
                <article
                  key={budget.budget_id}
                  className="rounded-[var(--radius-md)] border border-[var(--border)] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{budget.category_name}</h3>
                      <p className="text-sm text-[var(--text-secondary)]">
                        {budget.currency} ·{" "}
                        {budget.alert_level === "exceeded"
                          ? "Excedido"
                          : budget.alert_level === "warning"
                            ? "Atenção: acima de 80%"
                            : "Normal"}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p>Consumido {money(budget.spent, budget.currency)}</p>
                      <p
                        className={
                          Number(budget.remaining) < 0
                            ? "font-semibold text-[var(--danger)]"
                            : "text-[var(--text-secondary)]"
                        }
                      >
                        {Number(budget.remaining) < 0
                          ? "Excedente "
                          : "Restante "}
                        {money(
                          Math.abs(Number(budget.remaining)),
                          budget.currency,
                        )}
                      </p>
                    </div>
                  </div>
                  <div
                    className="mt-3 h-3 overflow-hidden rounded-full bg-[var(--surface-muted)]"
                    role="progressbar"
                    aria-valuenow={percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Consumo de ${budget.category_name}`}
                  >
                    <div
                      className={`h-full ${budget.alert_level === "exceeded" ? "bg-[var(--danger)]" : budget.alert_level === "warning" ? "bg-[var(--warning)]" : "bg-[var(--primary)]"}`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between gap-3 text-xs text-[var(--text-secondary)]">
                    <span>
                      {percent.toFixed(2)}% utilizado · Desvio{" "}
                      {money(budget.variance, budget.currency)}
                    </span>
                    <span>
                      Limite {money(budget.limit_amount, budget.currency)}
                    </span>
                  </div>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => remove(budget)}
                      className="mt-3 text-sm font-semibold text-[var(--danger)]"
                    >
                      Remover limite
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
