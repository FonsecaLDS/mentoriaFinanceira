"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  copyPlanningAction,
  upsertPlanningItemAction,
} from "../actions/planning.actions";
import {
  planningItemSchema,
  type PlanningItemInput,
} from "../schemas/planning.schema";

type Option = { id: string; name: string; currency?: string; type?: string };
type Summary = {
  currency: string;
  planned_income: string | number;
  actual_income: string | number;
  planned_expense: string | number;
  actual_expense: string | number;
  planned_result: string | number;
  actual_result: string | number;
  income_variance: string | number;
  expense_variance: string | number;
  budget_usage_percentage: string | number;
};
type Comparison = {
  currency: string;
  type: string;
  category_id: string | null;
  account_id: string | null;
  person_id: string | null;
  planned: string | number;
  actual: string | number;
  variance: string | number;
  usage_percentage: string | number;
};
function money(value: string | number, currency: string) {
  return `${currency} ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}
export function PlanningManager({
  tenantId,
  year,
  month,
  regime,
  summary,
  comparison,
  categories,
  accounts,
  people,
  canManage,
}: {
  tenantId: string;
  year: number;
  month: number;
  regime: "competence" | "cash";
  summary: Summary[];
  comparison: Comparison[];
  categories: Option[];
  accounts: Option[];
  people: Option[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);
  const form = useForm<PlanningItemInput>({
    resolver: zodResolver(planningItemSchema),
    defaultValues: {
      tenantId,
      year,
      month,
      type: "expense",
      amount: "",
      currency: accounts[0]?.currency ?? "BRL",
      categoryId: null,
      accountId: accounts[0]?.id ?? null,
      personId: null,
    },
  });
  function changePeriod(value: string) {
    const [nextYear, nextMonth] = value.split("-").map(Number);
    if (nextYear && nextMonth)
      router.push(
        `/t/${location.pathname.split("/")[2]}/planning?month=${value}&regime=${regime}`,
      );
  }
  function changeRegime(value: string) {
    router.push(
      `?month=${year}-${String(month).padStart(2, "0")}&regime=${value}`,
    );
  }
  async function submit(values: PlanningItemInput) {
    setBusy(true);
    setMessage(undefined);
    const result = await upsertPlanningItemAction(values);
    setBusy(false);
    if (result.error) setMessage(result.error);
    else {
      form.reset({ ...values, amount: "" });
      router.refresh();
    }
  }
  async function copyPrevious() {
    const date = new Date(year, month - 2, 1);
    setBusy(true);
    const result = await copyPlanningAction({
      tenantId,
      fromYear: date.getFullYear(),
      fromMonth: date.getMonth() + 1,
      toYear: year,
      toMonth: month,
    });
    setBusy(false);
    setMessage(result.error);
    if (!result.error) router.refresh();
  }
  const monthValue = `${year}-${String(month).padStart(2, "0")}`;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4">
        <label className="grid gap-1 text-sm font-semibold">
          Mês
          <input
            type="month"
            value={monthValue}
            onChange={(e) => changePeriod(e.target.value)}
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
        {canManage && (
          <button
            type="button"
            onClick={copyPrevious}
            disabled={busy}
            className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] px-4 text-sm font-semibold disabled:opacity-60"
          >
            Reutilizar mês anterior
          </button>
        )}
      </div>
      {summary.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {summary.map((item) => (
            <div
              key={item.currency}
              className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4"
            >
              <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase">
                {item.currency} · {regime === "cash" ? "Caixa" : "Competência"}
              </p>
              <p className="mt-2 text-lg font-bold">
                Realizado {money(item.actual_result, item.currency)}
              </p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Previsto {money(item.planned_result, item.currency)}
              </p>
              <p className="mt-1 text-sm">
                Despesas: {Number(item.budget_usage_percentage).toFixed(2)}%
              </p>
            </div>
          ))}
        </div>
      )}
      {canManage && (
        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-lg font-bold">Adicionar ou editar previsto</h2>
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
              Categoria
              <select
                {...form.register("categoryId")}
                className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
              >
                <option value="">Sem categoria</option>
                {categories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
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
              Conta
              <select
                {...form.register("accountId")}
                className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
              >
                <option value="">Sem conta</option>
                {accounts.map((item) => (
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
                {people.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Moeda
              <input
                {...form.register("currency")}
                maxLength={3}
                className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal uppercase"
              />
            </label>
            {message && (
              <p className="text-sm text-[var(--danger)] lg:col-span-3">
                {message}
              </p>
            )}
            <button
              disabled={busy}
              className="min-h-10 rounded-[var(--radius-md)] bg-[var(--primary)] px-4 font-semibold text-white disabled:opacity-60 lg:col-span-3"
            >
              {busy ? "Salvando…" : "Salvar previsto"}
            </button>
          </form>
        </section>
      )}
      <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-lg font-bold">Previsto x realizado</h2>
        {comparison.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--text-secondary)]">
            Nenhum valor planejado ou realizado neste período.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-[var(--border)] text-[var(--text-secondary)]">
                <tr>
                  <th className="p-3">Categoria</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Moeda</th>
                  <th className="p-3">Previsto</th>
                  <th className="p-3">Realizado</th>
                  <th className="p-3">Desvio</th>
                  <th className="p-3">%</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((item, index) => (
                  <tr
                    key={`${item.currency}-${item.type}-${item.category_id}-${item.account_id}-${item.person_id}-${index}`}
                    className="border-b border-[var(--border)]"
                  >
                    <td className="p-3">
                      {categories.find(
                        (category) => category.id === item.category_id,
                      )?.name ?? "Sem categoria"}
                    </td>
                    <td className="p-3">
                      {item.type === "income" ? "Receita" : "Despesa"}
                    </td>
                    <td className="p-3">{item.currency}</td>
                    <td className="p-3">
                      {money(item.planned, item.currency)}
                    </td>
                    <td className="p-3">{money(item.actual, item.currency)}</td>
                    <td
                      className={`p-3 font-semibold ${Number(item.variance) > 0 && item.type === "expense" ? "text-[var(--danger)]" : ""}`}
                    >
                      {money(item.variance, item.currency)}
                    </td>
                    <td className="p-3">
                      {Number(item.usage_percentage).toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
