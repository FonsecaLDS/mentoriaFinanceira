"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  createCostCenterAction,
  createPersonAction,
  setCostCenterStatusAction,
  setPersonStatusAction,
  updateCostCenterAction,
  updatePersonAction,
} from "../actions/catalog.actions";
import {
  costCenterSchema,
  personSchema,
  type CostCenterInput,
  type PersonInput,
} from "../schemas/catalog.schema";

type Person = {
  id: string;
  name: string;
  linked_user_id: string | null;
  is_active: boolean;
};
type CostCenter = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
};
type Member = { user_id: string; label: string };

export function CatalogManager({
  kind,
  tenantId,
  records,
  members = [],
  canManage,
}: {
  kind: "people" | "cost-centers";
  tenantId: string;
  records: Person[] | CostCenter[];
  members?: Member[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Person | CostCenter | null>(null);
  const [status, setStatus] = useState("active");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);
  const isPeople = kind === "people";
  const form = useForm<PersonInput | CostCenterInput>({
    resolver: zodResolver(isPeople ? personSchema : costCenterSchema),
    defaultValues: isPeople
      ? { tenantId, name: "", linkedUserId: "", isActive: true }
      : { tenantId, name: "", description: "", isActive: true },
  });
  const visible = records.filter(
    (record) =>
      (status === "all" || record.is_active === (status === "active")) &&
      record.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );
  function reset() {
    setEditing(null);
    form.reset(
      isPeople
        ? { tenantId, name: "", linkedUserId: "", isActive: true }
        : { tenantId, name: "", description: "", isActive: true },
    );
  }
  function edit(record: Person | CostCenter) {
    setEditing(record);
    form.reset(
      isPeople
        ? {
            tenantId,
            name: record.name,
            linkedUserId: (record as Person).linked_user_id ?? "",
            isActive: record.is_active,
          }
        : {
            tenantId,
            name: record.name,
            description: (record as CostCenter).description ?? "",
            isActive: record.is_active,
          },
    );
  }
  async function submit(values: PersonInput | CostCenterInput) {
    setBusy(true);
    setMessage(undefined);
    const result = isPeople
      ? editing
        ? await updatePersonAction({ ...values, id: editing.id })
        : await createPersonAction(values)
      : editing
        ? await updateCostCenterAction({ ...values, id: editing.id })
        : await createCostCenterAction(values);
    setBusy(false);
    if (result.error) setMessage(result.error);
    else {
      reset();
      router.refresh();
    }
  }
  async function toggle(record: Person | CostCenter) {
    if (
      !window.confirm(
        `${record.is_active ? "Desativar" : "Reativar"} “${record.name}”?`,
      )
    )
      return;
    const input = {
      tenantId,
      id: record.id,
      name: record.name,
      isActive: !record.is_active,
    };
    const result = isPeople
      ? await setPersonStatusAction(input)
      : await setCostCenterStatusAction(input);
    if (result.error) setMessage(result.error);
    else router.refresh();
  }
  return (
    <div className="space-y-6">
      {canManage && (
        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">
              {editing ? "Editar" : "Novo"}{" "}
              {isPeople ? "responsável" : "centro de custo"}
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
            {isPeople ? (
              <label className="grid gap-1 text-sm font-semibold">
                Vincular a membro (opcional)
                <select
                  {...form.register("linkedUserId")}
                  className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal"
                >
                  <option value="">Nenhum usuário</option>
                  {members.map((member) => (
                    <option key={member.user_id} value={member.user_id}>
                      {member.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="grid gap-1 text-sm font-semibold">
                Descrição (opcional)
                <textarea
                  {...form.register("description")}
                  className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 py-2 font-normal"
                  rows={2}
                />
              </label>
            )}
            <button
              disabled={busy}
              className="min-h-10 rounded-[var(--radius-md)] bg-[var(--primary)] px-4 font-semibold text-white disabled:opacity-50 sm:col-span-2"
            >
              {busy ? "Salvando…" : "Salvar"}
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
            <option value="inactive">Inativos</option>
            <option value="all">Todos</option>
          </select>
        </div>
        <div className="mt-4 divide-y divide-[var(--border)]">
          {visible.map((record) => (
            <div
              key={record.id}
              className="flex flex-wrap items-center gap-3 py-4"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{record.name}</p>
                <p className="text-sm text-[var(--text-secondary)]">
                  {isPeople
                    ? (record as Person).linked_user_id
                      ? "Vinculado a membro"
                      : "Sem usuário vinculado"
                    : (record as CostCenter).description || "Sem descrição"}
                </p>
              </div>
              <span className="text-sm">
                {record.is_active ? "Ativo" : "Inativo"}
              </span>
              {canManage && (
                <>
                  <button
                    type="button"
                    onClick={() => edit(record)}
                    className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] px-3 text-sm"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => toggle(record)}
                    className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] px-3 text-sm"
                  >
                    {record.is_active ? "Desativar" : "Reativar"}
                  </button>
                </>
              )}
            </div>
          ))}
          {visible.length === 0 && (
            <p className="py-6 text-sm text-[var(--text-secondary)]">
              Nenhum cadastro encontrado.
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
