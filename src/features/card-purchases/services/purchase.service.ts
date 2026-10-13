import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Client = SupabaseClient<Database>;
export const purchaseSelect =
  "id, tenant_id, card_id, description, purchased_at, total_amount, currency, installments_count, category_id, person_id, cost_center_id, idempotency_key, status, cancelled_at, created_by, created_at, updated_at";
export const installmentSelect =
  "id, tenant_id, purchase_id, card_id, transaction_id, invoice_cycle_id, invoice_id, installment_number, total_installments, amount, currency, competence_date, status, created_at, updated_at";
export const invoiceSelect =
  "id, tenant_id, card_id, invoice_cycle_id, total_amount, currency, status, closed_at, paid_at, created_at, updated_at";
export const invoicePaymentSelect =
  "id, tenant_id, invoice_id, account_id, movement_id, amount, currency, paid_at, idempotency_key, created_by, created_at, reversed_at, reversed_by, reversal_idempotency_key";
export function listCardPurchases(
  client: Client,
  tenantId: string,
  cardId?: string,
) {
  let query = client
    .from("card_purchases")
    .select(purchaseSelect)
    .eq("tenant_id", tenantId)
    .order("purchased_at", { ascending: false });
  if (cardId) query = query.eq("card_id", cardId);
  return query;
}
export function getCardPurchase(client: Client, tenantId: string, id: string) {
  return client
    .from("card_purchases")
    .select(purchaseSelect)
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .maybeSingle();
}
export function listInstallments(
  client: Client,
  tenantId: string,
  purchaseId: string,
) {
  return client
    .from("card_installments")
    .select(installmentSelect)
    .eq("tenant_id", tenantId)
    .eq("purchase_id", purchaseId)
    .order("installment_number");
}
export function createCardPurchase(
  client: Client,
  args: Record<string, unknown>,
) {
  return client.rpc("create_card_purchase", args as never);
}
export function cancelCardPurchase(
  client: Client,
  tenantId: string,
  purchaseId: string,
) {
  return client.rpc("cancel_card_purchase", {
    p_tenant_id: tenantId,
    p_purchase_id: purchaseId,
  });
}
export function listCardInvoices(
  client: Client,
  tenantId: string,
  cardId?: string,
) {
  let query = client
    .from("card_invoices")
    .select(invoiceSelect)
    .eq("tenant_id", tenantId)
    .order("invoice_cycle_id", { ascending: false });
  if (cardId) query = query.eq("card_id", cardId);
  return query;
}
export function getCardInvoice(client: Client, tenantId: string, id: string) {
  return client
    .from("card_invoices")
    .select(invoiceSelect)
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .maybeSingle();
}
export function generateCardInvoice(
  client: Client,
  tenantId: string,
  cardId: string,
  invoiceCycleId: string,
) {
  return client.rpc("generate_card_invoice", {
    p_tenant_id: tenantId,
    p_card_id: cardId,
    p_invoice_cycle_id: invoiceCycleId,
  });
}
export function closeCardInvoice(
  client: Client,
  tenantId: string,
  invoiceId: string,
) {
  return client.rpc("close_card_invoice", {
    p_tenant_id: tenantId,
    p_invoice_id: invoiceId,
  });
}
export function listCardInvoicePayments(
  client: Client,
  tenantId: string,
  invoiceId: string,
) {
  return client
    .from("card_invoice_payments")
    .select(invoicePaymentSelect)
    .eq("tenant_id", tenantId)
    .eq("invoice_id", invoiceId)
    .order("paid_at", { ascending: false });
}
export function listAllCardInvoicePayments(client: Client, tenantId: string) {
  return client
    .from("card_invoice_payments")
    .select(invoicePaymentSelect)
    .eq("tenant_id", tenantId)
    .order("paid_at", { ascending: false });
}
export function listCardInstallments(
  client: Client,
  tenantId: string,
  cardId?: string,
) {
  let query = client
    .from("card_installments")
    .select(installmentSelect)
    .eq("tenant_id", tenantId)
    .eq("status", "planned");
  if (cardId) query = query.eq("card_id", cardId);
  return query.order("competence_date");
}
export function listInvoiceCycles(
  client: Client,
  tenantId: string,
  cardId?: string,
) {
  let query = client
    .from("invoice_cycles")
    .select(
      "id, tenant_id, card_id, cycle_start, cycle_end, due_date, status, created_at, updated_at",
    )
    .eq("tenant_id", tenantId)
    .order("cycle_end");
  if (cardId) query = query.eq("card_id", cardId);
  return query;
}
export function payCardInvoice(client: Client, args: Record<string, unknown>) {
  return client.rpc("pay_card_invoice", args as never);
}
export function reverseCardInvoicePayment(
  client: Client,
  paymentId: string,
  idempotencyKey: string,
) {
  return client.rpc("reverse_card_invoice_payment", {
    p_payment_id: paymentId,
    p_idempotency_key: idempotencyKey,
  });
}

function toUnits(value: string) {
  const normalized = value.replace(",", ".");
  const sign = normalized.startsWith("-") ? BigInt(-1) : BigInt(1);
  const unsigned = normalized.replace(/^-/, "");
  const [whole, fraction = ""] = unsigned.split(".");
  return sign * BigInt(`${whole || "0"}${fraction.padEnd(4, "0").slice(0, 4)}`);
}
export function sumMoney(values: Array<string | number>) {
  return fromUnits(
    values.reduce((sum, value) => sum + toUnits(String(value)), BigInt(0)),
  );
}
export function subtractMoney(left: string | number, right: string | number) {
  return fromUnits(toUnits(String(left)) - toUnits(String(right)));
}
function fromUnits(value: bigint) {
  const sign = value < 0 ? "-" : "";
  const text = (value < 0 ? -value : value).toString().padStart(5, "0");
  return `${sign}${text.slice(0, -4)}.${text.slice(-4)}`;
}
export function previewInstallments(total: string, count: number) {
  const units = toUnits(total);
  const base = units / BigInt(count);
  const remainder = Number(units % BigInt(count));
  return Array.from({ length: count }, (_, index) =>
    fromUnits(base + BigInt(index < remainder ? 1 : 0)),
  );
}
