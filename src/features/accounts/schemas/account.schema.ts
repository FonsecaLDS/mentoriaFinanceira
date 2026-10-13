import { z } from "zod";

export const accountTypeSchema = z.enum([
  "checking",
  "savings",
  "cash",
  "digital_wallet",
  "benefit",
  "investment_tracking",
  "other",
]);
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
export const currencySchema = z
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
const openingBalance = z
  .string()
  .trim()
  .regex(/^-?\d+(?:[.,]\d{1,4})?$/, "Use um valor com até 4 casas decimais.");
const fields = {
  tenantId: z.string().uuid(),
  name: z
    .string()
    .trim()
    .min(1, "Informe um nome.")
    .max(120, "Use até 120 caracteres."),
  type: accountTypeSchema,
  institutionName: z
    .string()
    .trim()
    .max(120, "Use até 120 caracteres.")
    .optional(),
  currency: currencySchema,
  openingBalance,
  openingDate: z
    .string()
    .date("Informe uma data válida.")
    .refine(
      (value) => value <= new Date().toISOString().slice(0, 10),
      "A data não pode estar no futuro.",
    ),
  isActive: z.boolean().optional(),
};
export const createAccountSchema = z.object(fields);
export const updateAccountSchema = z.object({
  ...fields,
  id: z.string().uuid(),
});
export const accountStatusSchema = z.object({
  tenantId: z.string().uuid(),
  id: z.string().uuid(),
  isActive: z.boolean(),
});
export type AccountInput = z.infer<typeof createAccountSchema>;
