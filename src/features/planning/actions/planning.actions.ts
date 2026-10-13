"use server";

import { createClient } from "@/lib/supabase/server";
import {
  planningCopySchema,
  planningItemSchema,
} from "../schemas/planning.schema";

function databaseError(message?: string | null) {
  if (
    message?.includes("permission") ||
    message?.includes("row-level security")
  )
    return "Você não tem permissão para editar o planejamento.";
  if (message?.includes("currency"))
    return "A moeda precisa corresponder à conta.";
  if (message?.includes("category type"))
    return "A categoria precisa corresponder ao tipo.";
  if (message?.includes("source planning"))
    return "Não existe planejamento no mês de origem.";
  return "Não foi possível salvar o planejamento.";
}
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
export async function upsertPlanningItemAction(input: unknown) {
  const parsed = planningItemSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const client = await authorized(parsed.data.tenantId);
  if (!client)
    return { error: "Você não tem permissão para editar o planejamento." };
  const { error } = await client.rpc("upsert_monthly_plan_item", {
    p_tenant_id: parsed.data.tenantId,
    p_year: parsed.data.year,
    p_month: parsed.data.month,
    p_type: parsed.data.type,
    p_amount: parsed.data.amount.replace(",", "."),
    p_currency: parsed.data.currency,
    p_category_id: parsed.data.categoryId ?? null,
    p_account_id: parsed.data.accountId ?? null,
    p_person_id: parsed.data.personId ?? null,
  });
  return error ? { error: databaseError(error.message) } : { ok: true };
}
export async function copyPlanningAction(input: unknown) {
  const parsed = planningCopySchema.safeParse(input);
  if (!parsed.success) return { error: "Dados inválidos." };
  const client = await authorized(parsed.data.tenantId);
  if (!client)
    return { error: "Você não tem permissão para editar o planejamento." };
  const { error } = await client.rpc("copy_monthly_plan", {
    p_tenant_id: parsed.data.tenantId,
    p_from_year: parsed.data.fromYear,
    p_from_month: parsed.data.fromMonth,
    p_to_year: parsed.data.toYear,
    p_to_month: parsed.data.toMonth,
  });
  return error ? { error: databaseError(error.message) } : { ok: true };
}
