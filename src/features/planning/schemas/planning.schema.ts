import { z } from "zod";

export const planningItemSchema = z.object({
  tenantId: z.string().uuid(),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  type: z.enum(["income", "expense"]),
  amount: z
    .string()
    .trim()
    .regex(/^\d+(?:[.,]\d{1,4})?$/, "Use até 4 casas decimais."),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Informe uma moeda válida."),
  categoryId: z.string().uuid().nullable().optional(),
  accountId: z.string().uuid().nullable().optional(),
  personId: z.string().uuid().nullable().optional(),
});
export const planningCopySchema = z.object({
  tenantId: z.string().uuid(),
  fromYear: z.number().int(),
  fromMonth: z.number().int(),
  toYear: z.number().int(),
  toMonth: z.number().int(),
});
export type PlanningItemInput = z.infer<typeof planningItemSchema>;
