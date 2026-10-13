"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  archiveAccountAction,
  createAccountAction,
  updateAccountAction,
} from "../actions/account.actions";
import {
  accountTypeSchema,
  createAccountSchema,
  type AccountInput,
} from "../schemas/account.schema";

type Account = {
  id: string;
  name: string;
  type: string;
  institution_name: string | null;
  currency: string;
  opening_balance: string | number;
  opening_date: string;
  is_active: boolean;
};
const typeLabels: Record<string, string> = {
  checking: "Conta corrente",
  savings: "Poupança",
  cash: "Dinheiro",
  digital_wallet: "Carteira digital",
  benefit: "Benefício",
  investment_tracking: "Acompanhamento de investimento",
  other: "Outra",
};

export function AccountManager({
  tenantId,
  tenantSlug,
  accounts,
  canManage,
}: {
  tenantId: string;
  tenantSlug: string;
  accounts: Account[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Account | null>(null);
  const [status, setStatus] = useState("active");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const form = useForm<AccountInput>({
    resolver: zodResolver(createAccountSchema),
    defaultValues: {
      tenantId,
      name: "",
      type: "checking",
      institutionName: "",
      currency: "BRL",
      openingBalance: "0",
      openingDate: today,
      isActive: true,
    },
  });
  const visible = accounts.filter(
    (account) =>
      (status === "all" || account.is_active === (status === "active")) &&
      account.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );
  function reset() {
    setEditing(null);
    form.reset({
      tenantId,
      name: "",
      type: "checking",
      institutionName: "",
      currency: "BRL",
      openingBalance: "0",
      openingDate: today,
      isActive: true,
    });
  }
  function edit(account: Account) {
    setEditing(account);
    form.reset({
      tenantId,
      name: account.name,
      type: account.type as AccountInput["type"],
      institutionName: account.institution_name ?? "",
      currency: account.currency,
      openingBalance: String(account.opening_balance),
      openingDate: account.opening_date,
      isActive: account.is_active,
    });
  }
  async function submit(values: AccountInput) {
    setBusy(true);
    setMessage(undefined);
    const result = editing
      ? await updateAccountAction({ ...values, id: editing.id })
      : await createAccountAction(values);
    setBusy(false);
    if (result.error) setMessage(result.error);
    else {
      reset();
      router.refresh();
    }
  }
  async function toggle(account: Account) {
    if (
      !window.confirm(
        `${account.is_active ? "Arquivar" : "Reativar"} “${account.name}”?`,
      )
    )
      return;
    const result = await archiveAccountAction({
      tenantId,
      id: account.id,
      isActive: !account.is_active,
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
              {editing ? "Editar conta" : "Nova conta"}
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
              Tipo
              <select
                {...form.register("type")}
                className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
              >
                {accountTypeSchema.options.map((type) => (
                  <option key={type} value={type}>
                    {typeLabels[type]}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Instituição (opcional)
              <input
                {...form.register("institutionName")}
                className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Moeda ISO 4217
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
              Saldo inicial
              <input
                {...form.register("openingBalance")}
                inputMode="decimal"
                className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
              />
              {form.formState.errors.openingBalance && (
                <span className="font-normal text-[var(--danger)]">
                  {form.formState.errors.openingBalance.message}
                </span>
              )}
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Data-base
              <input
                {...form.register("openingDate")}
                type="date"
                className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
              />
              {form.formState.errors.openingDate && (
                <span className="font-normal text-[var(--danger)]">
                  {form.formState.errors.openingDate.message}
                </span>
              )}
            </label>
            <button
              disabled={busy}
              className="min-h-10 rounded-[var(--radius-md)] bg-[var(--primary)] px-4 font-semibold text-white disabled:opacity-50 sm:col-span-2"
            >
              {busy ? "Salvando…" : "Salvar conta"}
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
            <option value="active">Ativas</option>
            <option value="inactive">Arquivadas</option>
            <option value="all">Todas</option>
          </select>
        </div>
        <div className="mt-4 divide-y divide-[var(--border)]">
          {visible.map((account) => (
            <div
              key={account.id}
              className="flex flex-wrap items-center gap-3 py-4"
            >
              <Link
                href={`/t/${tenantSlug}/accounts/${account.id}`}
                className="min-w-0 flex-1"
              >
                <p className="truncate font-semibold">{account.name}</p>
                <p className="text-sm text-[var(--text-secondary)]">
                  {typeLabels[account.type] ?? account.type} ·{" "}
                  {account.currency}
                  {account.institution_name
                    ? ` · ${account.institution_name}`
                    : ""}
                </p>
                <p className="text-sm text-[var(--text-secondary)] tabular-nums">
                  Saldo inicial: {account.opening_balance} {account.currency} ·{" "}
                  {account.opening_date}
                </p>
              </Link>
              <span className="text-sm">
                {account.is_active ? "Ativa" : "Arquivada"}
              </span>
              {canManage && (
                <>
                  <button
                    type="button"
                    onClick={() => edit(account)}
                    className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] px-3 text-sm"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => toggle(account)}
                    className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] px-3 text-sm"
                  >
                    {account.is_active ? "Arquivar" : "Reativar"}
                  </button>
                </>
              )}
            </div>
          ))}
          {visible.length === 0 && (
            <p className="py-6 text-sm text-[var(--text-secondary)]">
              Nenhuma conta encontrada.
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
