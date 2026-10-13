"use server";

import { createClient } from "@/lib/supabase/server";
import {
  createCategorySchema,
  updateCategorySchema,
} from "../schemas/category.schema";
import {
  createCategory,
  deleteCategory,
  updateCategory,
} from "../services/category.service";

function databaseError(message?: string | null) {
  if (message?.includes("duplicate key"))
    return "Já existe uma categoria com esse nome.";
  if (message?.includes("hierarchy") || message?.includes("parent"))
    return "A hierarquia da categoria é inválida.";
  if (message?.includes("row-level security"))
    return "Você não tem permissão para essa operação.";
  return "Não foi possível concluir a operação.";
}

async function authenticatedClient() {
  const client = await createClient();
  const { data } = await client.auth.getUser();
  return data.user ? client : null;
}

export async function createCategoryAction(input: unknown) {
  const parsed = createCategorySchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const client = await authenticatedClient();
  if (!client) return { error: "Faça login para continuar." };
  const {
    tenantId,
    parentId,
    budgetGroup,
    color,
    icon,
    isActive,
    sortOrder,
    name,
    type,
  } = parsed.data;
  const { error } = await createCategory(client, {
    tenant_id: tenantId,
    parent_id: parentId ?? null,
    name,
    type,
    budget_group: budgetGroup ?? null,
    color: color ?? null,
    icon: icon ?? null,
    is_active: isActive ?? true,
    sort_order: sortOrder ?? 0,
  });
  return error ? { error: databaseError(error.message) } : { ok: true };
}

export async function updateCategoryAction(input: unknown) {
  const parsed = updateCategorySchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const client = await authenticatedClient();
  if (!client) return { error: "Faça login para continuar." };
  const {
    tenantId,
    id,
    parentId,
    budgetGroup,
    color,
    icon,
    isActive,
    sortOrder,
    name,
    type,
  } = parsed.data;
  const { error } = await updateCategory(client, id, tenantId, {
    parent_id: parentId ?? null,
    name,
    type,
    budget_group: budgetGroup ?? null,
    color: color ?? null,
    icon: icon ?? null,
    is_active: isActive ?? true,
    sort_order: sortOrder ?? 0,
  });
  return error ? { error: databaseError(error.message) } : { ok: true };
}

export async function setCategoryStatusAction(input: {
  tenantId: string;
  id: string;
  isActive: boolean;
}) {
  const client = await authenticatedClient();
  if (!client) return { error: "Faça login para continuar." };
  const { error } = await updateCategory(client, input.id, input.tenantId, {
    is_active: input.isActive,
  });
  return error ? { error: databaseError(error.message) } : { ok: true };
}

export async function deleteCategoryAction(input: {
  tenantId: string;
  id: string;
}) {
  const client = await authenticatedClient();
  if (!client) return { error: "Faça login para continuar." };
  const { error } = await deleteCategory(client, input.id, input.tenantId);
  return error ? { error: databaseError(error.message) } : { ok: true };
}
