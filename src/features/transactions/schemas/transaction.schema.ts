import { z } from "zod";

export const transactionTypeSchema = z.enum(["income", "expense"]);
export const transactionStatusSchema = z.enum([
  "planned",
  "pending",
  "partially_paid",
  "paid",
  "cancelled",
]);
const nullableUuid = z.string().uuid().nullable().optional().or(z.literal(""));
const fallbackCurrencies = new Set([
  "ARS",
  "AUD",
  "BRL",
  "CAD",
  "CHF",
  "CLP",
  "CNY",
  "COP",
  "EUR",
  "GBP",
  "JPY",
  "MXN",
  "USD",
]);
const currencySchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine(
    (value) =>
      typeof Intl.supportedValuesOf === "function"
        ? Intl.supportedValuesOf("currency").includes(value)
        : fallbackCurrencies.has(value),
    "Informe uma moeda ISO 4217 válida.",
  );
const fields = {
  tenantId: z.string().uuid(),
  type: transactionTypeSchema,
  description: z
    .string()
    .trim()
    .min(1, "Informe uma descrição.")
    .max(200, "Use até 200 caracteres."),
  amount: z
    .string()
    .trim()
    .regex(
      /^\d+(?:[.,]\d{1,4})?$/,
      "Use um valor positivo com até 4 casas decimais.",
    ),
  currency: currencySchema,
  categoryId: nullableUuid,
  personId: nullableUuid,
  costCenterId: nullableUuid,
  accountId: nullableUuid,
  competenceDate: z.string().date("Informe uma data válida."),
  dueDate: z
    .string()
    .date("Informe uma data válida.")
    .nullable()
    .optional()
    .or(z.literal("")),
  status: z.enum(["planned", "pending"]),
  notes: z.string().trim().max(2000, "Use até 2.000 caracteres.").optional(),
};
export const transactionSchema = z.object(fields).superRefine((value, ctx) => {
  if (value.dueDate && value.dueDate < value.competenceDate)
    ctx.addIssue({
      code: "custom",
      path: ["dueDate"],
      message: "O vencimento não pode ser anterior à competência.",
    });
});
export const updateTransactionSchema = transactionSchema.extend({
  id: z.string().uuid(),
});
export const cancelTransactionSchema = z.object({
  tenantId: z.string().uuid(),
  id: z.string().uuid(),
});
export const settlementSchema = z.object({
  tenantId: z.string().uuid(),
  transactionId: z.string().uuid(),
  accountId: z.string().uuid(),
  amount: z
    .string()
    .trim()
    .regex(/^\d+(?:[.,]\d{1,4})?$/, "Informe um valor válido."),
  settledDate: z.string().date("Informe uma data válida."),
});
export const reverseSettlementSchema = z.object({
  tenantId: z.string().uuid(),
  settlementId: z.string().uuid(),
});
export type TransactionInput = z.infer<typeof transactionSchema>;
