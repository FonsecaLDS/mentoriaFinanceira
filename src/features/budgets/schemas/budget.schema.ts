import { z } from "zod";

export const budgetSchema = z.object({
  tenantId: z.string().uuid(),
  categoryId: z.string().uuid(),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Informe uma moeda válida."),
  limitAmount: z
    .string()
    .trim()
    .regex(/^\d+(?:[.,]\d{1,4})?$/, "Use um limite com até 4 casas decimais."),
});
export const removeBudgetSchema = z.object({
  tenantId: z.string().uuid(),
  budgetId: z.string().uuid(),
});
export type BudgetInput = z.infer<typeof budgetSchema>;
