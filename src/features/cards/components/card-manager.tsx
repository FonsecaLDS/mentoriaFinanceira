"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createCardAction,
  setCardStateAction,
  updateCardAction,
} from "../actions/card.actions";
import { cardSchema, type CardInput } from "../schemas/card.schema";

type Card = {
  id: string;
  name: string;
  institution_name: string | null;
  credit_limit: string | number;
  currency: string;
  closing_day: number;
  due_day: number;
  payment_account_id: string | null;
  is_active: boolean;
  archived_at: string | null;
};
type CardSummary = {
  used: string;
  available: string;
  nextInvoice: string | null;
};
type Account = {
  id: string;
  name: string;
  currency: string;
  is_active: boolean;
};
const emptyValues = (tenantId: string): CardInput => ({
  tenantId,
  name: "",
  institutionName: "",
  creditLimit: "0",
  currency: "BRL",
  closingDay: 1,
  dueDay: 10,
  paymentAccountId: "",
});

export function CardManager({
  tenantId,
  cards,
  accounts,
  currencies,
  canManage,
  tenantSlug,
  summaries,
}: {
  tenantId: string;
  cards: Card[];
  accounts: Account[];
  currencies: string[];
  canManage: boolean;
  tenantSlug: string;
  summaries: Record<string, CardSummary>;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Card | null>(null);
  const [status, setStatus] = useState("active");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);
  const form = useForm<CardInput>({
    resolver: zodResolver(cardSchema),
    defaultValues: emptyValues(tenantId),
  });
  const currency = useWatch({ control: form.control, name: "currency" });
  const visibleAccounts = accounts.filter(
    (account) => account.is_active && account.currency === currency,
  );
  const visible = cards.filter(
    (card) =>
      (status === "all" || card.is_active === (status === "active")) &&
      card.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );
  function reset() {
    setEditing(null);
    form.reset(emptyValues(tenantId));
  }
  function edit(card: Card) {
    setEditing(card);
    form.reset({
      tenantId,
      name: card.name,
      institutionName: card.institution_name ?? "",
      creditLimit: String(card.credit_limit),
      currency: card.currency,
      closingDay: card.closing_day,
      dueDay: card.due_day,
      paymentAccountId: card.payment_account_id ?? "",
    });
  }
  async function submit(values: CardInput) {
    setBusy(true);
    setMessage(undefined);
    const result = editing
      ? await updateCardAction({ ...values, id: editing.id })
      : await createCardAction(values);
    setBusy(false);
    if (result.error) setMessage(result.error);
    else {
      reset();
      router.refresh();
    }
  }
  async function toggle(card: Card) {
    if (
      !window.confirm(
        `${card.is_active ? "Arquivar" : "Reativar"} “${card.name}”?`,
      )
    )
      return;
    const result = await setCardStateAction({
      tenantId,
      id: card.id,
      isActive: !card.is_active,
    });
    if (result.error) setMessage(result.error);
    else router.refresh();
  }
  return (
    <div className="space-y-6">
      {canManage && (
        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">
              {editing ? "Editar cartão" : "Novo cartão"}
            </h2>
            {editing && (
              <button
                type="button"
                onClick={reset}
                className="text-sm text-[var(--text-secondary)]"
              >
                Cancelar
              </button>
            )}
          </div>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Não armazenamos número, CVV ou senha. O dia inexistente em um mês
            será ajustado ao último dia quando as faturas forem implementadas.
          </p>
          <form
            onSubmit={form.handleSubmit(submit)}
            className="mt-4 grid gap-4 sm:grid-cols-2"
          >
            <label className="grid gap-1 text-sm font-semibold">
              Nome
              <input
                {...form.register("name")}
                className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
              />
              {form.formState.errors.name && (
                <span className="font-normal text-[var(--danger)]">
                  {form.formState.errors.name.message}
                </span>
              )}
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Instituição (opcional)
              <input
                {...form.register("institutionName")}
                className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Limite de crédito
              <input
                inputMode="decimal"
                {...form.register("creditLimit")}
                className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
              />
              {form.formState.errors.creditLimit && (
                <span className="font-normal text-[var(--danger)]">
                  {form.formState.errors.creditLimit.message}
                </span>
              )}
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
              Dia de fechamento
              <input
                type="number"
                min="1"
                max="31"
                {...form.register("closingDay", { valueAsNumber: true })}
                className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
              />
              {form.formState.errors.closingDay && (
                <span className="font-normal text-[var(--danger)]">
                  Informe um dia entre 1 e 31.
                </span>
              )}
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Dia de vencimento
              <input
                type="number"
                min="1"
                max="31"
                {...form.register("dueDay", { valueAsNumber: true })}
                className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
              />
              {form.formState.errors.dueDay && (
                <span className="font-normal text-[var(--danger)]">
                  Informe um dia entre 1 e 31.
                </span>
              )}
            </label>
            <label className="grid gap-1 text-sm font-semibold sm:col-span-2">
              Conta padrão para pagamento
              <select
                {...form.register("paymentAccountId")}
                className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
              >
                <option value="">Sem conta definida</option>
                {visibleAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.currency})
                  </option>
                ))}
              </select>
            </label>
            <button
              disabled={busy}
              className="min-h-10 rounded-[var(--radius-md)] bg-[var(--primary)] px-4 font-semibold text-white disabled:opacity-50 sm:col-span-2"
            >
              {busy ? "Salvando…" : "Salvar cartão"}
            </button>
          </form>
        </section>
      )}
      <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome"
            aria-label="Buscar por nome"
            className="min-h-10 min-w-0 flex-1 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3"
          />
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="Filtrar status"
            className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3"
          >
            <option value="active">Ativos</option>
            <option value="inactive">Arquivados</option>
            <option value="all">Todos</option>
          </select>
        </div>
        <div className="mt-4 divide-y divide-[var(--border)]">
          {visible.map((card) => (
            <div
              key={card.id}
              className="flex flex-wrap items-center gap-3 py-4"
            >
              <div className="min-w-0 flex-1">
                <Link
                  href={`/t/${tenantSlug}/cards/${card.id}`}
                  className="truncate font-semibold text-[var(--primary)] hover:underline"
                >
                  {card.name}
                </Link>
                <p className="text-sm text-[var(--text-secondary)]">
                  {card.currency} · Limite:{" "}
                  {Number(card.credit_limit).toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                  {card.institution_name ? ` · ${card.institution_name}` : ""}
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  Fecha dia {card.closing_day} · vence dia {card.due_day}
                </p>
                <p className="mt-1 text-sm tabular-nums">
                  Usado: {summaries[card.id]?.used ?? "0.0000"} {card.currency}{" "}
                  · Disponível:{" "}
                  {summaries[card.id]?.available ?? String(card.credit_limit)}{" "}
                  {card.currency}
                </p>
                {summaries[card.id]?.nextInvoice && (
                  <p className="text-sm text-[var(--text-secondary)]">
                    Próxima fatura: {summaries[card.id]?.nextInvoice}{" "}
                    {card.currency}
                  </p>
                )}
              </div>
              <span className="text-sm">
                {card.is_active ? "Ativo" : "Arquivado"}
              </span>
              {canManage && (
                <>
                  <button
                    type="button"
                    onClick={() => edit(card)}
                    className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] px-3 text-sm"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => toggle(card)}
                    className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] px-3 text-sm"
                  >
                    {card.is_active ? "Arquivar" : "Reativar"}
                  </button>
                </>
              )}
            </div>
          ))}
          {visible.length === 0 && (
            <p className="py-6 text-sm text-[var(--text-secondary)]">
              Nenhum cartão encontrado.
            </p>
          )}
        </div>
        {message && (
          <p role="alert" className="mt-4 text-sm text-[var(--danger)]">
            {message}
          </p>
        )}
      </section>
    </div>
  );
}
