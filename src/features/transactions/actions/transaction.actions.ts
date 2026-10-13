"use server";

import { createClient } from "@/lib/supabase/server";
import {
  cancelTransactionSchema,
  reverseSettlementSchema,
  settlementSchema,
  transactionSchema,
  updateTransactionSchema,
} from "../schemas/transaction.schema";
import {
  createTransaction,
  updateTransaction,
} from "../services/transaction.service";

function errorMessage(message?: string | null) {
  if (message?.includes("duplicate key"))
    return "Esta transação já existe ou a chave de operação foi repetida.";
  if (message?.includes("category type"))
    return "A categoria precisa ser do mesmo tipo da transação.";
  if (message?.includes("currency"))
    return "A moeda da transação precisa corresponder à conta.";
  if (message?.includes("over pending") || message?.includes("exceeds pending"))
    return "O valor excede o saldo pendente.";
  if (
    message?.includes("permission") ||
    message?.includes("row-level security")
  )
    return "Você não tem permissão para essa operação.";
  if (message?.includes("cancelled") || message?.includes("history"))
    return "A transação não pode mais ser alterada nesse estado.";
  return "Não foi possível concluir a operação.";
}
async function authorizedClient(tenantId: string) {
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
    ? { client, user }
    : null;
}
function dbInput(input: {
  tenantId: string;
  type: string;
  description: string;
  amount: string;
  currency: string;
  categoryId?: string | null;
  personId?: string | null;
  costCenterId?: string | null;
  accountId?: string | null;
  competenceDate: string;
  dueDate?: string | null;
  status: string;
  notes?: string;
}) {
  return {
    tenant_id: input.tenantId,
    type: input.type,
    description: input.description,
    amount: input.amount.replace(",", "."),
    currency: input.currency,
    category_id: input.categoryId || null,
    person_id: input.personId || null,
    cost_center_id: input.costCenterId || null,
    account_id: input.accountId || null,
    competence_date: input.competenceDate,
    due_date: input.dueDate || null,
    status: input.status,
    notes: input.notes || null,
  };
}
export async function createTransactionAction(input: unknown) {
  const parsed = transactionSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const auth = await authorizedClient(parsed.data.tenantId);
  if (!auth) return { error: "Você não tem permissão para essa operação." };
  const { error } = await createTransaction(auth.client, {
    ...dbInput(parsed.data),
    created_by: auth.user.id,
  });
  return error ? { error: errorMessage(error.message) } : { ok: true };
}
export async function updateTransactionAction(input: unknown) {
  const parsed = updateTransactionSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const auth = await authorizedClient(parsed.data.tenantId);
  if (!auth) return { error: "Você não tem permissão para essa operação." };
  const { id, tenantId, ...values } = parsed.data;
  const { error } = await updateTransaction(
    auth.client,
    id,
    tenantId,
    dbInput({ tenantId, ...values }),
  );
  return error ? { error: errorMessage(error.message) } : { ok: true };
}
export async function cancelTransactionAction(input: unknown) {
  const parsed = cancelTransactionSchema.safeParse(input);
  if (!parsed.success) return { error: "Dados inválidos." };
  const auth = await authorizedClient(parsed.data.tenantId);
  if (!auth) return { error: "Você não tem permissão para essa operação." };
  const { error } = await updateTransaction(
    auth.client,
    parsed.data.id,
    parsed.data.tenantId,
    { status: "cancelled" },
  );
  return error ? { error: errorMessage(error.message) } : { ok: true };
}
export async function settleTransactionAction(input: unknown) {
  const parsed = settlementSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const auth = await authorizedClient(parsed.data.tenantId);
  if (!auth) return { error: "Você não tem permissão para essa operação." };
  const { data, error } = await auth.client.rpc("settle_transaction", {
    p_transaction_id: parsed.data.transactionId,
    p_account_id: parsed.data.accountId,
    p_amount: parsed.data.amount.replace(",", "."),
    p_settled_at: new Date(
      `${parsed.data.settledDate}T12:00:00-03:00`,
    ).toISOString(),
    p_idempotency_key: `${parsed.data.transactionId}-${crypto.randomUUID()}`,
  });
  return error || !data
    ? { error: errorMessage(error?.message) }
    : { ok: true };
}
export async function reverseSettlementAction(input: unknown) {
  const parsed = reverseSettlementSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const auth = await authorizedClient(parsed.data.tenantId);
  if (!auth) return { error: "Você não tem permissão para essa operação." };
  const { data, error } = await auth.client.rpc(
    "reverse_transaction_settlement",
    {
      p_settlement_id: parsed.data.settlementId,
      p_idempotency_key: `${parsed.data.settlementId}-reversal-${crypto.randomUUID()}`,
    },
  );
  return error || !data
    ? { error: errorMessage(error?.message) }
    : { ok: true };
}
