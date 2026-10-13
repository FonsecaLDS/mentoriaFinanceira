"use client";

import {
  Banknote,
  BriefcaseBusiness,
  Car,
  CircleDollarSign,
  ConciergeBell,
  Gamepad2,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  MoreHorizontal,
  ShoppingBag,
  Utensils,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  createCategoryAction,
  deleteCategoryAction,
  setCategoryStatusAction,
  updateCategoryAction,
} from "../actions/category.actions";
import {
  categoryIconSchema,
  createCategorySchema,
  type CategoryInput,
} from "../schemas/category.schema";

type Category = {
  id: string;
  tenant_id: string;
  parent_id: string | null;
  name: string;
  type: string;
  budget_group: string | null;
  color: string | null;
  icon: string | null;
  is_active: boolean;
  sort_order: number;
};

const labels = { income: "Receitas", expense: "Despesas" };
const groupLabels = {
  fixed: "Fixa",
  variable: "Variável",
  personal: "Pessoal",
  savings: "Poupança",
  other: "Outra",
};
const iconMap: Record<string, LucideIcon> = {
  "briefcase-business": BriefcaseBusiness,
  gift: Gift,
  "circle-dollar-sign": CircleDollarSign,
  "more-horizontal": MoreHorizontal,
  home: Home,
  utensils: Utensils,
  car: Car,
  "heart-pulse": HeartPulse,
  "graduation-cap": GraduationCap,
  "gamepad-2": Gamepad2,
  "shopping-bag": ShoppingBag,
  "concierge-bell": ConciergeBell,
  wallet: Wallet,
  banknote: Banknote,
};

export function CategoryManager({
  tenantId,
  categories,
  canManage,
  canDelete,
}: {
  tenantId: string;
  categories: Category[];
  canManage: boolean;
  canDelete: boolean;
}) {
  const [editing, setEditing] = useState<Category | null>(null);
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">(
    "all",
  );
  const [statusFilter, setStatusFilter] = useState("active");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [iconMenuOpen, setIconMenuOpen] = useState(false);
  const router = useRouter();
  const form = useForm<CategoryInput>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: {
      tenantId,
      type: "expense",
      name: "",
      parentId: null,
      budgetGroup: "other",
      color: "#245CF6",
      icon: "circle-dollar-sign",
      isActive: true,
      sortOrder: 0,
    },
  });
  const selectedType = form.watch("type");
  const selectedIcon = form.watch("icon") ?? "circle-dollar-sign";
  const SelectedIcon = iconMap[selectedIcon] ?? CircleDollarSign;
  const visible = categories.filter(
    (category) =>
      (typeFilter === "all" || category.type === typeFilter) &&
      (statusFilter === "all" ||
        category.is_active === (statusFilter === "active")) &&
      category.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );
  const parents = categories.filter(
    (category) =>
      category.type === selectedType &&
      category.parent_id === null &&
      category.id !== editing?.id,
  );

  function edit(category: Category) {
    setEditing(category);
    form.reset({
      tenantId,
      name: category.name,
      type: category.type as CategoryInput["type"],
      parentId: category.parent_id,
      budgetGroup: category.budget_group as CategoryInput["budgetGroup"],
      color: category.color,
      icon: category.icon as CategoryInput["icon"],
      isActive: category.is_active,
      sortOrder: category.sort_order,
    });
  }
  function resetForm() {
    setEditing(null);
    form.reset({
      tenantId,
      type: "expense",
      name: "",
      parentId: null,
      budgetGroup: "other",
      color: "#245CF6",
      icon: "circle-dollar-sign",
      isActive: true,
      sortOrder: 0,
    });
  }
  async function submit(values: CategoryInput) {
    setBusy(true);
    setMessage(undefined);
    const normalized = { ...values, parentId: values.parentId || null };
    const result = editing
      ? await updateCategoryAction({ ...normalized, id: editing.id })
      : await createCategoryAction(normalized);
    setBusy(false);
    if (result.error) setMessage(result.error);
    else router.refresh();
  }
  async function status(category: Category) {
    const result = await setCategoryStatusAction({
      tenantId,
      id: category.id,
      isActive: !category.is_active,
    });
    if (result.error) setMessage(result.error);
    else router.refresh();
  }
  async function remove(category: Category) {
    if (!window.confirm(`Excluir “${category.name}”?`)) return;
    const result = await deleteCategoryAction({ tenantId, id: category.id });
    if (result.error) setMessage(result.error);
    else router.refresh();
  }

  return (
    <div className="space-y-6">
      {canManage && (
        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">
              {editing ? "Editar categoria" : "Nova categoria"}
            </h2>
            {editing && (
              <button
                type="button"
                onClick={resetForm}
                className="text-sm text-[var(--text-secondary)]"
              >
                Cancelar
              </button>
            )}
          </div>
          <form
            onSubmit={form.handleSubmit(submit)}
            className="mt-4 grid gap-3 sm:grid-cols-2"
          >
            <label className="grid gap-1 text-sm sm:col-span-2">
              Nome
              <input
                {...form.register("name")}
                className="min-h-11 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3"
              />
              {form.formState.errors.name && (
                <span className="text-[var(--danger)]">
                  {form.formState.errors.name.message}
                </span>
              )}
            </label>
            <label className="grid gap-1 text-sm">
              Tipo
              <select
                {...form.register("type")}
                className="min-h-11 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3"
              >
                <option value="expense">Despesa</option>
                <option value="income">Receita</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              Categoria pai
              <select
                {...form.register("parentId")}
                className="min-h-11 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3"
              >
                <option value="">Nenhuma</option>
                {parents.map((parent) => (
                  <option key={parent.id} value={parent.id}>
                    {parent.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              Grupo
              <select
                {...form.register("budgetGroup")}
                className="min-h-11 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3"
              >
                {Object.entries(groupLabels).map(([group, label]) => (
                  <option key={group} value={group}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              Cor
              <input
                type="color"
                {...form.register("color")}
                className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent p-1"
              />
            </label>
            <label className="grid gap-1 text-sm">
              Ícone
              <input type="hidden" {...form.register("icon")} />
              <div className="relative">
                <button
                  type="button"
                  aria-label="Selecionar ícone"
                  aria-haspopup="listbox"
                  aria-expanded={iconMenuOpen}
                  onClick={() => setIconMenuOpen((open) => !open)}
                  className="flex min-h-11 w-full items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3"
                >
                  <SelectedIcon className="size-5" aria-hidden="true" />
                  <span className="text-xs text-[var(--text-secondary)]">
                    Escolher ícone
                  </span>
                </button>
                {iconMenuOpen && (
                  <div
                    role="listbox"
                    aria-label="Ícones disponíveis"
                    className="absolute z-10 mt-1 grid w-full grid-cols-7 gap-1 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-2 shadow-lg"
                  >
                    {categoryIconSchema.options.map((icon) => {
                      const Icon = iconMap[icon];
                      return (
                        <button
                          key={icon}
                          type="button"
                          role="option"
                          aria-label={icon}
                          aria-selected={selectedIcon === icon}
                          onClick={() => {
                            form.setValue("icon", icon, {
                              shouldValidate: true,
                            });
                            setIconMenuOpen(false);
                          }}
                          className={`grid min-h-10 place-items-center rounded-[var(--radius-sm)] ${selectedIcon === icon ? "bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)]" : "hover:bg-[var(--surface-muted)]"}`}
                        >
                          <Icon className="size-5" aria-hidden="true" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </label>
            <button
              disabled={busy}
              className="min-h-11 rounded-[var(--radius-md)] bg-[var(--primary)] px-5 text-sm font-semibold text-white disabled:opacity-60 sm:col-span-2"
            >
              {busy
                ? "Salvando…"
                : editing
                  ? "Salvar alterações"
                  : "Criar categoria"}
            </button>
          </form>
        </section>
      )}
      {message && (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {message}
        </p>
      )}
      <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            aria-label="Buscar categoria"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar categoria"
            className="min-h-11 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3"
          />
          <select
            aria-label="Tipo de categoria"
            value={typeFilter}
            onChange={(event) =>
              setTypeFilter(event.target.value as typeof typeFilter)
            }
            className="min-h-11 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3"
          >
            <option value="all">Todos os tipos</option>
            <option value="income">Receitas</option>
            <option value="expense">Despesas</option>
          </select>
          <select
            aria-label="Status da categoria"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="min-h-11 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3"
          >
            <option value="active">Ativas</option>
            <option value="inactive">Inativas</option>
            <option value="all">Todas</option>
          </select>
        </div>
        <div className="mt-5 space-y-5">
          {(["income", "expense"] as const).map((type) => (
            <div key={type}>
              <h2 className="font-bold">{labels[type]}</h2>
              <div className="mt-2 divide-y divide-[var(--border)]">
                {visible
                  .filter((category) => category.type === type)
                  .map((category) => (
                    <div
                      key={category.id}
                      className="flex flex-wrap items-center gap-3 py-3"
                    >
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: category.color ?? "#245CF6" }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">
                          {category.parent_id ? "↳ " : ""}
                          {category.name}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {category.is_active ? "Ativa" : "Inativa"} ·{" "}
                          {category.budget_group
                            ? groupLabels[
                                category.budget_group as keyof typeof groupLabels
                              ]
                            : "Sem grupo"}
                        </p>
                      </div>
                      {canManage && (
                        <>
                          <button
                            type="button"
                            onClick={() => edit(category)}
                            className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] px-3 text-sm"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => status(category)}
                            className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] px-3 text-sm"
                          >
                            {category.is_active ? "Desativar" : "Reativar"}
                          </button>
                        </>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => remove(category)}
                          className="min-h-10 rounded-[var(--radius-md)] border border-[var(--danger)] px-3 text-sm text-[var(--danger)]"
                        >
                          Excluir
                        </button>
                      )}
                    </div>
                  ))}
                {visible.filter((category) => category.type === type).length ===
                  0 && (
                  <p className="py-3 text-sm text-[var(--text-secondary)]">
                    Nenhuma categoria encontrada.
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
