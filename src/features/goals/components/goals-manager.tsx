"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  allocateToReserveAction,
  createGoalAction,
  createReserveAction,
  updateGoalAction,
  withdrawFromReserveAction,
} from "../actions/goal.actions";
import {
  goalSchema,
  reserveMovementSchema,
  reserveSchema,
} from "../schemas/goal.schema";
import type {
  GoalInput,
  ReserveInput,
  ReserveMovementInput,
} from "../schemas/goal.schema";

type Goal = {
  id: string;
  name: string;
  target_amount: string | number;
  currency: string;
  target_date: string | null;
  status: string;
};
type Reserve = {
  id: string;
  goal_id: string | null;
  name: string;
  currency: string;
  is_active: boolean;
};
type Movement = {
  reserve_id: string;
  amount: string | number;
  kind: string;
  effective_at: string;
};
type Account = {
  id: string;
  name: string;
  currency: string;
  is_active: boolean;
};
const money = (value: number | string, currency: string) =>
  `${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ${currency}`;
const date = (value: string) =>
  new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR");

export function GoalsManager({
  tenantId,
  goals,
  reserves,
  movements,
  accounts,
  canManage,
}: {
  tenantId: string;
  goals: Goal[];
  reserves: Reserve[];
  movements: Movement[];
  accounts: Account[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string>();
  const [editing, setEditing] = useState<Goal | null>(null);
  const [busy, setBusy] = useState(false);
  const goalForm = useForm<GoalInput>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      tenantId,
      name: "",
      targetAmount: "",
      currency: accounts[0]?.currency ?? "BRL",
      targetDate: null,
    },
  });
  const reserveForm = useForm<ReserveInput>({
    resolver: zodResolver(reserveSchema),
    defaultValues: {
      tenantId,
      goalId: "",
      name: "",
      currency: accounts[0]?.currency ?? "BRL",
    },
  });
  const movementForm = useForm<ReserveMovementInput>({
    resolver: zodResolver(reserveMovementSchema),
    defaultValues: {
      tenantId,
      reserveId: reserves[0]?.id ?? "",
      accountId: accounts[0]?.id ?? "",
      amount: "",
      effectiveDate: new Date().toISOString().slice(0, 10),
    },
  });
  const balance = (reserveId: string) =>
    movements
      .filter((movement) => movement.reserve_id === reserveId)
      .reduce((sum, movement) => sum + Number(movement.amount), 0);
  const submitGoal = async (values: GoalInput) => {
    setBusy(true);
    setMessage(undefined);
    const result = editing
      ? await updateGoalAction({
          ...values,
          id: editing.id,
          status: editing.status,
        })
      : await createGoalAction(values);
    setBusy(false);
    if (result.error) setMessage(result.error);
    else {
      goalForm.reset({ ...values, name: "", targetAmount: "" });
      setEditing(null);
      router.refresh();
    }
  };
  const submitReserve = async (values: ReserveInput) => {
    setBusy(true);
    setMessage(undefined);
    const result = await createReserveAction(values);
    setBusy(false);
    if (result.error) setMessage(result.error);
    else {
      reserveForm.reset({ ...values, name: "", goalId: "" });
      router.refresh();
    }
  };
  const submitMovement = async (
    values: ReserveMovementInput,
    withdrawal: boolean,
  ) => {
    setBusy(true);
    setMessage(undefined);
    const result = withdrawal
      ? await withdrawFromReserveAction(values)
      : await allocateToReserveAction(values);
    setBusy(false);
    if (result.error) setMessage(result.error);
    else {
      movementForm.reset({ ...values, amount: "" });
      router.refresh();
    }
  };
  return (
    <div className="space-y-6">
      {canManage && (
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="text-lg font-bold">
              {editing ? "Editar meta" : "Nova meta"}
            </h2>
            <form
              onSubmit={goalForm.handleSubmit(submitGoal)}
              className="mt-4 grid gap-3"
            >
              <input type="hidden" {...goalForm.register("tenantId")} />
              <label className="grid gap-1 text-sm font-semibold">
                Nome
                <input
                  {...goalForm.register("name")}
                  className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
                />
              </label>
              <label className="grid gap-1 text-sm font-semibold">
                Valor-alvo
                <input
                  {...goalForm.register("targetAmount")}
                  inputMode="decimal"
                  className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
                />
              </label>
              <label className="grid gap-1 text-sm font-semibold">
                Moeda
                <select
                  {...goalForm.register("currency")}
                  className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
                >
                  <option>BRL</option>
                  <option>USD</option>
                  <option>EUR</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm font-semibold">
                Prazo
                <input
                  type="date"
                  {...goalForm.register("targetDate")}
                  className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
                />
              </label>
              <button
                disabled={busy}
                className="min-h-10 rounded-[var(--radius-md)] bg-[var(--primary)] px-4 font-semibold text-white disabled:opacity-50"
              >
                {busy ? "Salvando…" : "Salvar meta"}
              </button>
            </form>
          </section>
          <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="text-lg font-bold">Nova reserva</h2>
            <form
              onSubmit={reserveForm.handleSubmit(submitReserve)}
              className="mt-4 grid gap-3"
            >
              <label className="grid gap-1 text-sm font-semibold">
                Nome
                <input
                  {...reserveForm.register("name")}
                  className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
                />
              </label>
              <label className="grid gap-1 text-sm font-semibold">
                Meta (opcional)
                <select
                  {...reserveForm.register("goalId")}
                  className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
                >
                  <option value="">Sem meta</option>
                  {goals
                    .filter((goal) => goal.status !== "archived")
                    .map((goal) => (
                      <option key={goal.id} value={goal.id}>
                        {goal.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-semibold">
                Moeda
                <select
                  {...reserveForm.register("currency")}
                  className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
                >
                  <option>BRL</option>
                  <option>USD</option>
                  <option>EUR</option>
                </select>
              </label>
              <button
                disabled={busy}
                className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] px-4 font-semibold disabled:opacity-50"
              >
                Criar reserva
              </button>
            </form>
          </section>
          <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="text-lg font-bold">Movimentar reserva</h2>
            <form className="mt-4 grid gap-3">
              <label className="grid gap-1 text-sm font-semibold">
                Reserva
                <select
                  {...movementForm.register("reserveId")}
                  className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
                >
                  {reserves.map((reserve) => (
                    <option key={reserve.id} value={reserve.id}>
                      {reserve.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-semibold">
                Conta
                <select
                  {...movementForm.register("accountId")}
                  className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
                >
                  {accounts
                    .filter((account) => account.is_active)
                    .map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({account.currency})
                      </option>
                    ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-semibold">
                Valor
                <input
                  {...movementForm.register("amount")}
                  inputMode="decimal"
                  className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
                />
              </label>
              <label className="grid gap-1 text-sm font-semibold">
                Data
                <input
                  type="date"
                  {...movementForm.register("effectiveDate")}
                  className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={movementForm.handleSubmit((values) =>
                    submitMovement(values, false),
                  )}
                  className="min-h-10 rounded-[var(--radius-md)] bg-[var(--primary)] px-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Aportar
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={movementForm.handleSubmit((values) =>
                    submitMovement(values, true),
                  )}
                  className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] px-3 text-sm font-semibold disabled:opacity-50"
                >
                  Retirar
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {goals.map((goal) => {
          const reserve = reserves.find((item) => item.goal_id === goal.id);
          const current = reserve ? balance(reserve.id) : 0;
          const progress = Math.min(
            100,
            Math.max(0, (current / Number(goal.target_amount)) * 100),
          );
          return (
            <article
              key={goal.id}
              className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold">{goal.name}</h2>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {goal.status === "active"
                      ? "Ativa"
                      : goal.status === "completed"
                        ? "Concluída"
                        : "Arquivada"}
                    {goal.target_date ? ` · até ${date(goal.target_date)}` : ""}
                  </p>
                </div>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(goal);
                      goalForm.reset({
                        tenantId,
                        name: goal.name,
                        targetAmount: String(goal.target_amount),
                        currency: goal.currency,
                        targetDate: goal.target_date,
                      });
                    }}
                    className="text-sm text-[var(--primary)]"
                  >
                    Editar
                  </button>
                )}
              </div>
              <p className="mt-4 text-2xl font-bold tabular-nums">
                {money(current, goal.currency)}
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                de {money(goal.target_amount, goal.currency)}
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--border)]">
                <div
                  className="h-full bg-[var(--primary)]"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 text-sm">
                {progress.toFixed(1)}% efetivo{" "}
                {reserve ? `· ${reserve.name}` : "· sem reserva vinculada"}
              </p>
            </article>
          );
        })}
        {goals.length === 0 && (
          <p className="text-sm text-[var(--text-secondary)]">
            Nenhuma meta cadastrada.
          </p>
        )}
      </section>
      <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-lg font-bold">Reservas e histórico</h2>
        <div className="mt-3 divide-y divide-[var(--border)]">
          {reserves.map((reserve) => (
            <div key={reserve.id} className="py-3">
              <div className="flex flex-wrap justify-between gap-3">
                <span className="font-semibold">{reserve.name}</span>
                <span className="tabular-nums">
                  {money(balance(reserve.id), reserve.currency)}
                </span>
              </div>
              {movements
                .filter((movement) => movement.reserve_id === reserve.id)
                .slice(0, 5)
                .map((movement, index) => (
                  <p
                    key={`${reserve.id}-${movement.effective_at}-${index}`}
                    className="mt-1 text-sm text-[var(--text-secondary)]"
                  >
                    {movement.kind === "allocation" ? "Aporte" : "Retirada"} ·{" "}
                    {money(Math.abs(Number(movement.amount)), reserve.currency)}{" "}
                    · {date(movement.effective_at)}
                  </p>
                ))}
            </div>
          ))}
          {reserves.length === 0 && (
            <p className="text-sm text-[var(--text-secondary)]">
              Nenhuma reserva cadastrada.
            </p>
          )}
        </div>
      </section>
      {message && (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {message}
        </p>
      )}
    </div>
  );
}
