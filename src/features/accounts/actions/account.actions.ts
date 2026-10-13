"use server";

import { createClient } from "@/lib/supabase/server";
import {
  accountStatusSchema,
  createAccountSchema,
  updateAccountSchema,
} from "../schemas/account.schema";
import { createAccount, updateAccount } from "../services/account.service";

function databaseError(message?: string | null) {
  if (message?.includes("duplicate key"))
    return "Já existe uma conta com esse nome.";
  if (message?.includes("opening date"))
    return "A data do saldo inicial não pode estar no futuro.";
  if (message?.includes("history cannot"))
    return "A moeda e o saldo inicial não podem ser alterados após movimentações.";
  if (message?.includes("row-level security"))
    return "Você não tem permissão para essa operação.";
  return "Não foi possível concluir a operação.";
}
async function authenticatedClient() {
  const client = await createClient();
  const { data } = await client.auth.getUser();
  return data.user ? client : null;
}
function dbInput(input: {
  tenantId: string;
  name: string;
  type: string;
  institutionName?: string;
  currency: string;
  openingBalance: string;
  openingDate: string;
  isActive?: boolean;
}) {
  return {
    tenant_id: input.tenantId,
    name: input.name,
    type: input.type,
    institution_name: input.institutionName || null,
    currency: input.currency,
    opening_balance: input.openingBalance.replace(",", "."),
    opening_date: input.openingDate,
    is_active: input.isActive ?? true,
  };
}
export async function createAccountAction(input: unknown) {
  const parsed = createAccountSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const client = await authenticatedClient();
  if (!client) return { error: "Faça login para continuar." };
  const { error } = await createAccount(client, dbInput(parsed.data));
  return error ? { error: databaseError(error.message) } : { ok: true };
}
export async function updateAccountAction(input: unknown) {
  const parsed = updateAccountSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const client = await authenticatedClient();
  if (!client) return { error: "Faça login para continuar." };
  const { id, tenantId, ...values } = parsed.data;
  const { error } = await updateAccount(
    client,
    id,
    tenantId,
    dbInput({ tenantId, ...values }),
  );
  return error ? { error: databaseError(error.message) } : { ok: true };
}
export async function archiveAccountAction(input: unknown) {
  const parsed = accountStatusSchema.safeParse(input);
  if (!parsed.success) return { error: "Dados inválidos." };
  const client = await authenticatedClient();
  if (!client) return { error: "Faça login para continuar." };
  const { error } = await updateAccount(
    client,
    parsed.data.id,
    parsed.data.tenantId,
    { is_active: parsed.data.isActive },
  );
  return error ? { error: databaseError(error.message) } : { ok: true };
}
export const reactivateAccountAction = archiveAccountAction;
