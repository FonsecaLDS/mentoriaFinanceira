"use server";

import { createClient } from "@/lib/supabase/server";
import {
  cardSchema,
  cardStateSchema,
  updateCardSchema,
} from "../schemas/card.schema";
import { createCard, setCardState, updateCard } from "../services/card.service";

async function authorized(tenantId: string) {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return null;
  const { data: membership } = await client
    .from("tenant_members")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  return membership && ["owner", "admin", "editor"].includes(membership.role)
    ? client
    : null;
}
function args(input: Record<string, unknown>) {
  return {
    p_tenant_id: input.tenantId,
    p_name: input.name,
    p_institution_name: input.institutionName || null,
    p_credit_limit: String(input.creditLimit).replace(",", "."),
    p_currency: input.currency,
    p_closing_day: input.closingDay,
    p_due_day: input.dueDay,
    p_payment_account_id: input.paymentAccountId || null,
  };
}
function message(value?: string) {
  if (value?.includes("duplicate key"))
    return "Já existe um cartão com esse nome.";
  if (value?.includes("payment account"))
    return "A conta de pagamento precisa ser ativa e usar a mesma moeda.";
  if (value?.includes("permission") || value?.includes("row-level"))
    return "Você não tem permissão para essa operação.";
  if (value?.includes("not found")) return "Cartão não encontrado.";
  return "Não foi possível concluir a operação.";
}
export async function createCardAction(input: unknown) {
  const parsed = cardSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const client = await authorized(parsed.data.tenantId);
  if (!client) return { error: "Você não tem permissão para essa operação." };
  const { error } = await createCard(client, args(parsed.data));
  return error ? { error: message(error.message) } : { ok: true };
}
export async function updateCardAction(input: unknown) {
  const parsed = updateCardSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const client = await authorized(parsed.data.tenantId);
  if (!client) return { error: "Você não tem permissão para essa operação." };
  const { id, ...values } = parsed.data;
  const { error } = await updateCard(client, {
    ...args(values),
    p_card_id: id,
  });
  return error ? { error: message(error.message) } : { ok: true };
}
export async function setCardStateAction(input: unknown) {
  const parsed = cardStateSchema.safeParse(input);
  if (!parsed.success) return { error: "Dados inválidos." };
  const client = await authorized(parsed.data.tenantId);
  if (!client) return { error: "Você não tem permissão para essa operação." };
  const { error } = await setCardState(client, {
    p_tenant_id: parsed.data.tenantId,
    p_card_id: parsed.data.id,
    p_is_active: parsed.data.isActive,
  });
  return error ? { error: message(error.message) } : { ok: true };
}
