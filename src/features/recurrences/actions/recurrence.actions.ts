"use server";

import { createClient } from "@/lib/supabase/server";
import {
  recurrenceSchema,
  recurrenceStateSchema,
  updateRecurrenceSchema,
} from "../schemas/recurrence.schema";
import {
  createRecurrence,
  generateDueOccurrences,
  setRecurrenceState,
  updateRecurrence,
} from "../services/recurrence.service";

function dbArgs(input: Record<string, unknown>) {
  return {
    p_tenant_id: input.tenantId,
    p_type: input.type,
    p_frequency: input.frequency,
    p_interval: input.interval,
    p_start_date: input.startDate,
    p_end_date: input.endDate || null,
    p_max_occurrences:
      input.maxOccurrences === "" || input.maxOccurrences == null
        ? null
        : Number(input.maxOccurrences),
    p_amount: String(input.amount).replace(",", "."),
    p_currency: input.currency,
    p_description: input.description,
    p_category_id: input.categoryId || null,
    p_person_id: input.personId || null,
    p_cost_center_id: input.costCenterId || null,
    p_account_id: input.accountId || null,
  };
}
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
function message(error?: string) {
  if (error?.includes("currency"))
    return "A moeda precisa corresponder à conta.";
  if (error?.includes("category type"))
    return "A categoria precisa ser do mesmo tipo.";
  if (error?.includes("permission") || error?.includes("row-level"))
    return "Você não tem permissão para essa operação.";
  if (error?.includes("not found")) return "Recorrência não encontrada.";
  return "Não foi possível concluir a operação.";
}
export async function createRecurrenceAction(input: unknown) {
  const parsed = recurrenceSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const client = await authorized(parsed.data.tenantId);
  if (!client) return { error: "Você não tem permissão para essa operação." };
  const { error } = await createRecurrence(client, dbArgs(parsed.data));
  return error ? { error: message(error.message) } : { ok: true };
}
export async function updateRecurrenceAction(input: unknown) {
  const parsed = updateRecurrenceSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const client = await authorized(parsed.data.tenantId);
  if (!client) return { error: "Você não tem permissão para essa operação." };
  const { id, ...values } = parsed.data;
  const { error } = await updateRecurrence(client, {
    ...dbArgs(values),
    p_rule_id: id,
  });
  return error ? { error: message(error.message) } : { ok: true };
}
export async function setRecurrenceStateAction(input: unknown) {
  const parsed = recurrenceStateSchema.safeParse(input);
  if (!parsed.success) return { error: "Dados inválidos." };
  const client = await authorized(parsed.data.tenantId);
  if (!client) return { error: "Você não tem permissão para essa operação." };
  const { error } = await setRecurrenceState(client, {
    p_tenant_id: parsed.data.tenantId,
    p_rule_id: parsed.data.id,
    p_action: parsed.data.action,
  });
  return error ? { error: message(error.message) } : { ok: true };
}
export async function generateRecurrencesAction(input: {
  tenantId: string;
  untilDate?: string;
}) {
  const client = await authorized(input.tenantId);
  if (!client) return { error: "Você não tem permissão para essa operação." };
  const { data, error } = await generateDueOccurrences(
    client,
    input.tenantId,
    input.untilDate,
  );
  return error ? { error: message(error.message) } : { generated: data ?? 0 };
}
