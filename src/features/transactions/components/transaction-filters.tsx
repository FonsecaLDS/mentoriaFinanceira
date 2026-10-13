"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
type Option = { id: string; name: string };
export function TransactionFilters({
  categories,
  accounts,
  people,
  costCenters,
}: {
  categories: Option[];
  accounts: Option[];
  people: Option[];
  costCenters: Option[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  function update(name: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(name, value);
    else params.delete(name);
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  }
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const params = new URLSearchParams(searchParams.toString());
    [
      "type",
      "status",
      "category",
      "account",
      "person",
      "costCenter",
      "from",
      "to",
      "min",
      "max",
    ].forEach((name) => {
      const value = String(data.get(name) ?? "");
      if (value) params.set(name, value);
      else params.delete(name);
    });
    params.set("q", search);
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  }
  return (
    <form
      onSubmit={submit}
      className="grid gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <input
        name="q"
        value={search}
        onChange={(event) => {
          const value = event.target.value;
          setSearch(value);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => update("q", value), 350);
        }}
        placeholder="Buscar descrição"
        aria-label="Buscar descrição"
        className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 lg:col-span-2"
      />
      <select
        name="type"
        defaultValue={searchParams.get("type") ?? ""}
        onChange={(event) => update("type", event.target.value)}
        aria-label="Tipo"
        className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3"
      >
        <option value="">Todos os tipos</option>
        <option value="income">Receitas</option>
        <option value="expense">Despesas</option>
      </select>
      <select
        name="status"
        defaultValue={searchParams.get("status") ?? ""}
        onChange={(event) => update("status", event.target.value)}
        aria-label="Status"
        className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3"
      >
        <option value="">Todos os status</option>
        <option value="planned">Previstas</option>
        <option value="pending">Pendentes</option>
        <option value="partially_paid">Parciais</option>
        <option value="paid">Pagas</option>
        <option value="cancelled">Canceladas</option>
      </select>
      <select
        name="category"
        defaultValue={searchParams.get("category") ?? ""}
        aria-label="Categoria"
        className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3"
      >
        <option value="">Todas as categorias</option>
        {categories.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
      <select
        name="account"
        defaultValue={searchParams.get("account") ?? ""}
        aria-label="Conta"
        className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3"
      >
        <option value="">Todas as contas</option>
        {accounts.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
      <select
        name="person"
        defaultValue={searchParams.get("person") ?? ""}
        aria-label="Responsável"
        className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3"
      >
        <option value="">Todos os responsáveis</option>
        {people.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
      <select
        name="costCenter"
        defaultValue={searchParams.get("costCenter") ?? ""}
        aria-label="Centro de custo"
        className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3"
      >
        <option value="">Todos os centros</option>
        {costCenters.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
      <input
        name="from"
        defaultValue={searchParams.get("from") ?? ""}
        type="date"
        aria-label="Data inicial"
        className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3"
      />
      <input
        name="to"
        defaultValue={searchParams.get("to") ?? ""}
        type="date"
        aria-label="Data final"
        className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3"
      />
      <input
        name="min"
        defaultValue={searchParams.get("min") ?? ""}
        inputMode="decimal"
        placeholder="Valor mínimo"
        aria-label="Valor mínimo"
        className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3"
      />
      <input
        name="max"
        defaultValue={searchParams.get("max") ?? ""}
        inputMode="decimal"
        placeholder="Valor máximo"
        aria-label="Valor máximo"
        className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3"
      />
      <button className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] px-4 font-semibold">
        Aplicar filtros
      </button>
      <button
        type="button"
        onClick={() => router.push("?")}
        className="min-h-10 rounded-[var(--radius-md)] px-4 text-sm text-[var(--text-secondary)]"
      >
        Limpar
      </button>
    </form>
  );
}
