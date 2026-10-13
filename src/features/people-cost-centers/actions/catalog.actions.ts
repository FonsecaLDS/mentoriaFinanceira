"use server";

import { createClient } from "@/lib/supabase/server";
import {
  catalogIdSchema,
  costCenterSchema,
  personSchema,
} from "../schemas/catalog.schema";
import {
  createCostCenter,
  createPerson,
  updateCostCenter,
  updatePerson,
} from "../services/catalog.service";

function errorMessage(message?: string | null) {
  if (message?.includes("duplicate key"))
    return "Já existe um cadastro com esse nome.";
  if (message?.includes("foreign key") || message?.includes("tenant_members"))
    return "O usuário selecionado não pertence a este tenant.";
  if (message?.includes("row-level security"))
    return "Você não tem permissão para essa operação.";
  return "Não foi possível concluir a operação.";
}
async function clientOrError() {
  const client = await createClient();
  const { data } = await client.auth.getUser();
  return data.user ? client : null;
}
export async function createPersonAction(input: unknown) {
  const parsed = personSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const client = await clientOrError();
  if (!client) return { error: "Faça login para continuar." };
  const { tenantId, name, linkedUserId, isActive } = parsed.data;
  const { error } = await createPerson(client, {
    tenant_id: tenantId,
    name,
    linked_user_id: linkedUserId || null,
    is_active: isActive ?? true,
  });
  return error ? { error: errorMessage(error.message) } : { ok: true };
}
export async function updatePersonAction(input: unknown) {
  const parsed = personSchema
    .extend({ id: catalogIdSchema.shape.id })
    .safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const client = await clientOrError();
  if (!client) return { error: "Faça login para continuar." };
  const { tenantId, id, name, linkedUserId, isActive } = parsed.data;
  const { error } = await updatePerson(client, id, tenantId, {
    name,
    linked_user_id: linkedUserId || null,
    is_active: isActive ?? true,
  });
  return error ? { error: errorMessage(error.message) } : { ok: true };
}
export async function setPersonStatusAction(input: unknown) {
  const parsed = catalogIdSchema.safeParse(input);
  if (!parsed.success) return { error: "Dados inválidos." };
  const client = await clientOrError();
  if (!client) return { error: "Faça login para continuar." };
  const { error } = await updatePerson(
    client,
    parsed.data.id,
    parsed.data.tenantId,
    { is_active: parsed.data.isActive },
  );
  return error ? { error: errorMessage(error.message) } : { ok: true };
}
export async function createCostCenterAction(input: unknown) {
  const parsed = costCenterSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const client = await clientOrError();
  if (!client) return { error: "Faça login para continuar." };
  const { tenantId, name, description, isActive } = parsed.data;
  const { error } = await createCostCenter(client, {
    tenant_id: tenantId,
    name,
    description: description || null,
    is_active: isActive ?? true,
  });
  return error ? { error: errorMessage(error.message) } : { ok: true };
}
export async function updateCostCenterAction(input: unknown) {
  const parsed = costCenterSchema
    .extend({ id: catalogIdSchema.shape.id })
    .safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const client = await clientOrError();
  if (!client) return { error: "Faça login para continuar." };
  const { tenantId, id, name, description, isActive } = parsed.data;
  const { error } = await updateCostCenter(client, id, tenantId, {
    name,
    description: description || null,
    is_active: isActive ?? true,
  });
  return error ? { error: errorMessage(error.message) } : { ok: true };
}
export async function setCostCenterStatusAction(input: unknown) {
  const parsed = catalogIdSchema.safeParse(input);
  if (!parsed.success) return { error: "Dados inválidos." };
  const client = await clientOrError();
  if (!client) return { error: "Faça login para continuar." };
  const { error } = await updateCostCenter(
    client,
    parsed.data.id,
    parsed.data.tenantId,
    { is_active: parsed.data.isActive },
  );
  return error ? { error: errorMessage(error.message) } : { ok: true };
}
