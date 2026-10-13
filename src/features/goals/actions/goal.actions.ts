"use server";

import { createClient } from "@/lib/supabase/server";
import {
  createGoal,
  createReserve,
  updateGoal,
  allocateToReserve,
  withdrawFromReserve,
} from "../services/goal.service";
import {
  goalSchema,
  reserveMovementSchema,
  reserveSchema,
  updateGoalSchema,
} from "../schemas/goal.schema";

async function authorized(tenantId: string) {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return null;
  const { data: member } = await client
    .from("tenant_members")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  return member && ["owner", "admin", "editor"].includes(member.role)
    ? client
    : null;
}
function message(value?: string) {
  if (value?.includes("currency"))
    return "A moeda da conta precisa corresponder à moeda da reserva.";
  if (value?.includes("exceeds")) return "O valor excede o saldo disponível.";
  if (value?.includes("idempotency"))
    return "A operação já foi enviada com dados diferentes.";
  if (value?.includes("permission") || value?.includes("row-level"))
    return "Você não tem permissão para essa operação.";
  return "Não foi possível concluir a operação.";
}
export async function createGoalAction(input: unknown) {
  const parsed = goalSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const client = await authorized(parsed.data.tenantId);
  if (!client) return { error: "Você não tem permissão para essa operação." };
  const { data, error } = await createGoal(client, {
    p_tenant_id: parsed.data.tenantId,
    p_name: parsed.data.name,
    p_target_amount: parsed.data.targetAmount.replace(",", "."),
    p_currency: parsed.data.currency,
    p_target_date: parsed.data.targetDate || null,
  });
  return error || !data
    ? { error: message(error?.message) }
    : { ok: true, id: data.id };
}
export async function updateGoalAction(input: unknown) {
  const parsed = updateGoalSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const client = await authorized(parsed.data.tenantId);
  if (!client) return { error: "Você não tem permissão para essa operação." };
  const { data, error } = await updateGoal(client, {
    p_tenant_id: parsed.data.tenantId,
    p_goal_id: parsed.data.id,
    p_name: parsed.data.name,
    p_target_amount: parsed.data.targetAmount.replace(",", "."),
    p_target_date: parsed.data.targetDate || null,
    p_status: parsed.data.status,
  });
  return error || !data
    ? { error: message(error?.message) }
    : { ok: true, id: data.id };
}
export async function createReserveAction(input: unknown) {
  const parsed = reserveSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const client = await authorized(parsed.data.tenantId);
  if (!client) return { error: "Você não tem permissão para essa operação." };
  const { data, error } = await createReserve(client, {
    p_tenant_id: parsed.data.tenantId,
    p_goal_id: parsed.data.goalId || null,
    p_name: parsed.data.name,
    p_currency: parsed.data.currency,
  });
  return error || !data
    ? { error: message(error?.message) }
    : { ok: true, id: data.id };
}
async function reserveMovement(input: unknown, withdrawal: boolean) {
  const parsed = reserveMovementSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const client = await authorized(parsed.data.tenantId);
  if (!client) return { error: "Você não tem permissão para essa operação." };
  const args = {
    p_tenant_id: parsed.data.tenantId,
    p_reserve_id: parsed.data.reserveId,
    p_account_id: parsed.data.accountId,
    p_amount: parsed.data.amount.replace(",", "."),
    p_effective_at: new Date(
      `${parsed.data.effectiveDate}T12:00:00-03:00`,
    ).toISOString(),
    p_idempotency_key: `reserve-${withdrawal ? "withdrawal" : "allocation"}-${crypto.randomUUID()}`,
  };
  const { error } = await (withdrawal
    ? withdrawFromReserve(client, args)
    : allocateToReserve(client, args));
  return error ? { error: message(error.message) } : { ok: true };
}
export async function allocateToReserveAction(input: unknown) {
  return reserveMovement(input, false);
}
export async function withdrawFromReserveAction(input: unknown) {
  return reserveMovement(input, true);
}
