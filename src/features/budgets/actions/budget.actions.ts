"use server";

import { createClient } from "@/lib/supabase/server";
import { budgetSchema, removeBudgetSchema } from "../schemas/budget.schema";

function errorMessage(message?: string | null) {
  if (
    message?.includes("permission") ||
    message?.includes("row-level security")
  )
    return "Você não tem permissão para editar orçamentos.";
  if (message?.includes("leaf category"))
    return "Escolha uma categoria sem subcategorias ativas.";
  if (message?.includes("expense category"))
    return "Orçamentos só podem usar categorias de despesa.";
  if (message?.includes("currency")) return "A moeda informada é inválida.";
  return "Não foi possível salvar o orçamento.";
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
export async function upsertBudgetAction(input: unknown) {
  const parsed = budgetSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const client = await authorized(parsed.data.tenantId);
  if (!client)
    return { error: "Você não tem permissão para editar orçamentos." };
  const { error } = await client.rpc("upsert_category_budget", {
    p_tenant_id: parsed.data.tenantId,
    p_category_id: parsed.data.categoryId,
    p_year: parsed.data.year,
    p_month: parsed.data.month,
    p_currency: parsed.data.currency,
    p_limit_amount: parsed.data.limitAmount.replace(",", "."),
  });
  return error ? { error: errorMessage(error.message) } : { ok: true };
}
export async function removeBudgetAction(input: unknown) {
  const parsed = removeBudgetSchema.safeParse(input);
  if (!parsed.success) return { error: "Dados inválidos." };
  const client = await authorized(parsed.data.tenantId);
  if (!client)
    return { error: "Você não tem permissão para editar orçamentos." };
  const { error } = await client.rpc("remove_category_budget", {
    p_tenant_id: parsed.data.tenantId,
    p_budget_id: parsed.data.budgetId,
  });
  return error ? { error: errorMessage(error.message) } : { ok: true };
}
