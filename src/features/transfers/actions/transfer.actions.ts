"use server";

import { createClient } from "@/lib/supabase/server";
import { transferSchema } from "../schemas/transfer.schema";

function dbError(message?: string | null) {
  if (message?.includes("currency"))
    return "As contas precisam usar a mesma moeda.";
  if (message?.includes("active accounts"))
    return "As duas contas precisam estar ativas.";
  if (message?.includes("idempotency"))
    return "A operação já foi enviada com dados diferentes.";
  if (
    message?.includes("permission") ||
    message?.includes("row-level security")
  )
    return "Você não tem permissão para essa operação.";
  if (message?.includes("not found"))
    return "Conta ou transferência não encontrada.";
  return "Não foi possível concluir a transferência.";
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
export async function createTransferAction(input: unknown) {
  const parsed = transferSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const client = await authorized(parsed.data.tenantId);
  if (!client) return { error: "Você não tem permissão para essa operação." };
  const { data, error } = await client.rpc("create_transfer", {
    p_source_account_id: parsed.data.sourceAccountId,
    p_target_account_id: parsed.data.targetAccountId,
    p_amount: parsed.data.amount.replace(",", "."),
    p_currency: parsed.data.currency,
    p_effective_at: new Date(
      `${parsed.data.effectiveDate}T12:00:00-03:00`,
    ).toISOString(),
    p_description: parsed.data.description || null,
    p_idempotency_key: `transfer-${crypto.randomUUID()}`,
  });
  return error || !data ? { error: dbError(error?.message) } : { ok: true };
}
export async function reverseTransferAction(input: unknown) {
  if (!input || typeof input !== "object") return { error: "Dados inválidos." };
  const value = input as { tenantId?: string; transferId?: string };
  if (!value.tenantId || !value.transferId)
    return { error: "Dados inválidos." };
  const client = await authorized(value.tenantId);
  if (!client) return { error: "Você não tem permissão para essa operação." };
  const { data, error } = await client.rpc("reverse_transfer", {
    p_transfer_id: value.transferId,
    p_idempotency_key: `transfer-reversal-${crypto.randomUUID()}`,
  });
  return error || !data ? { error: dbError(error?.message) } : { ok: true };
}
