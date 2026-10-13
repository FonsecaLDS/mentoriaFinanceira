"use server";

import { createClient } from "@/lib/supabase/server";
import {
  cancelPurchaseSchema,
  invoicePaymentSchema,
  purchaseSchema,
  reverseInvoicePaymentSchema,
} from "../schemas/purchase.schema";
import {
  cancelCardPurchase,
  closeCardInvoice,
  createCardPurchase,
  generateCardInvoice,
  payCardInvoice,
  reverseCardInvoicePayment,
} from "../services/purchase.service";

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
function message(value?: string) {
  if (value?.includes("idempotency"))
    return "Esta compra já foi registrada ou a chave foi reutilizada com dados diferentes.";
  if (value?.includes("currency"))
    return "A moeda da compra precisa corresponder ao cartão.";
  if (value?.includes("active credit card"))
    return "O cartão precisa estar ativo.";
  if (value?.includes("settled"))
    return "Compra já liquidada não pode ser cancelada.";
  if (value?.includes("exceeds pending"))
    return "O pagamento excede o valor pendente da fatura.";
  if (value?.includes("currency"))
    return "A moeda da conta precisa corresponder à moeda da fatura.";
  if (value?.includes("only closed"))
    return "Somente faturas fechadas podem ser pagas.";
  if (value?.includes("permission") || value?.includes("row-level"))
    return "Você não tem permissão para essa operação.";
  return "Não foi possível concluir a operação.";
}
export async function createCardPurchaseAction(input: unknown) {
  const parsed = purchaseSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const client = await authorized(parsed.data.tenantId);
  if (!client) return { error: "Você não tem permissão para essa operação." };
  const { data, error } = await createCardPurchase(client, {
    p_tenant_id: parsed.data.tenantId,
    p_card_id: parsed.data.cardId,
    p_description: parsed.data.description,
    p_purchased_at: parsed.data.purchasedAt,
    p_total_amount: parsed.data.totalAmount.replace(",", "."),
    p_currency: parsed.data.currency,
    p_installments_count: parsed.data.installmentsCount,
    p_category_id: parsed.data.categoryId || null,
    p_person_id: parsed.data.personId || null,
    p_cost_center_id: parsed.data.costCenterId || null,
    p_idempotency_key: `card-purchase-${crypto.randomUUID()}`,
  });
  return error || !data
    ? { error: message(error?.message) }
    : { ok: true, id: data.id };
}
export async function cancelCardPurchaseAction(input: unknown) {
  const parsed = cancelPurchaseSchema.safeParse(input);
  if (!parsed.success) return { error: "Dados inválidos." };
  const client = await authorized(parsed.data.tenantId);
  if (!client) return { error: "Você não tem permissão para essa operação." };
  const { error } = await cancelCardPurchase(
    client,
    parsed.data.tenantId,
    parsed.data.id,
  );
  return error ? { error: message(error.message) } : { ok: true };
}
export async function generateCardInvoiceAction(input: {
  tenantId: string;
  cardId: string;
  invoiceCycleId: string;
}) {
  const client = await authorized(input.tenantId);
  if (!client) return { error: "Você não tem permissão para essa operação." };
  const { data, error } = await generateCardInvoice(
    client,
    input.tenantId,
    input.cardId,
    input.invoiceCycleId,
  );
  return error || !data
    ? { error: message(error?.message) }
    : { ok: true, id: data.id };
}
export async function closeCardInvoiceAction(input: {
  tenantId: string;
  invoiceId: string;
}) {
  const client = await authorized(input.tenantId);
  if (!client) return { error: "Você não tem permissão para essa operação." };
  const { data, error } = await closeCardInvoice(
    client,
    input.tenantId,
    input.invoiceId,
  );
  return error || !data
    ? { error: message(error?.message) }
    : { ok: true, id: data.id };
}
export async function payCardInvoiceAction(input: unknown) {
  const parsed = invoicePaymentSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const client = await authorized(parsed.data.tenantId);
  if (!client) return { error: "Você não tem permissão para essa operação." };
  const { data, error } = await payCardInvoice(client, {
    p_tenant_id: parsed.data.tenantId,
    p_invoice_id: parsed.data.invoiceId,
    p_account_id: parsed.data.accountId,
    p_amount: parsed.data.amount.replace(",", "."),
    p_paid_at: parsed.data.paidAt,
    p_idempotency_key: `invoice-payment-${crypto.randomUUID()}`,
  });
  return error || !data
    ? { error: message(error?.message) }
    : { ok: true, id: data.id };
}
export async function reverseCardInvoicePaymentAction(input: unknown) {
  const parsed = reverseInvoicePaymentSchema.safeParse(input);
  if (!parsed.success) return { error: "Dados inválidos." };
  const client = await authorized(parsed.data.tenantId);
  if (!client) return { error: "Você não tem permissão para essa operação." };
  const { error } = await reverseCardInvoicePayment(
    client,
    parsed.data.paymentId,
    `invoice-reversal-${crypto.randomUUID()}`,
  );
  return error ? { error: message(error.message) } : { ok: true };
}
