import { z } from "zod";
import { currencySchema } from "@/features/accounts/schemas/account.schema";

const nullableUuid = z.string().uuid().nullable().optional().or(z.literal(""));
export const purchaseSchema = z.object({
  tenantId: z.string().uuid(),
  cardId: z.string().uuid(),
  description: z.string().trim().min(1).max(200),
  purchasedAt: z.string().date(),
  totalAmount: z
    .string()
    .trim()
    .regex(
      /^\d+(?:[.,]\d{1,4})?$/,
      "Informe um valor positivo com até 4 casas decimais.",
    ),
  currency: currencySchema,
  installmentsCount: z.number().int().min(1).max(120),
  categoryId: nullableUuid,
  personId: nullableUuid,
  costCenterId: nullableUuid,
});
export const cancelPurchaseSchema = z.object({
  tenantId: z.string().uuid(),
  id: z.string().uuid(),
});
export const invoicePaymentSchema = z.object({
  tenantId: z.string().uuid(),
  invoiceId: z.string().uuid(),
  accountId: z.string().uuid(),
  amount: z
    .string()
    .trim()
    .regex(
      /^\d+(?:[.,]\d{1,4})?$/,
      "Informe um valor positivo com até 4 casas decimais.",
    ),
  paidAt: z.string().datetime(),
});
export const reverseInvoicePaymentSchema = z.object({
  tenantId: z.string().uuid(),
  paymentId: z.string().uuid(),
});
export type PurchaseInput = z.infer<typeof purchaseSchema>;
