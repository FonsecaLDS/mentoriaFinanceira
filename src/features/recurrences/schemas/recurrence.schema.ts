import { z } from "zod";

const nullableUuid = z.string().uuid().nullable().optional().or(z.literal(""));
const currency = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, "Informe uma moeda ISO 4217.");
const fields = {
  tenantId: z.string().uuid(),
  type: z.enum(["income", "expense"]),
  frequency: z.enum(["daily", "weekly", "monthly"]),
  interval: z.number().int().min(1).max(365),
  startDate: z.string().date("Informe uma data inicial válida."),
  endDate: z
    .string()
    .date("Informe uma data final válida.")
    .optional()
    .or(z.literal("")),
  maxOccurrences: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .optional()
    .or(z.literal("")),
  amount: z
    .string()
    .trim()
    .regex(/^\d+(?:[.,]\d{1,4})?$/, "Informe um valor válido."),
  currency,
  description: z.string().trim().min(1, "Informe uma descrição.").max(200),
  categoryId: nullableUuid,
  personId: nullableUuid,
  costCenterId: nullableUuid,
  accountId: nullableUuid,
};
export const recurrenceSchema = z.object(fields).superRefine((value, ctx) => {
  if (value.endDate && value.endDate < value.startDate)
    ctx.addIssue({
      code: "custom",
      path: ["endDate"],
      message: "A data final não pode ser anterior à inicial.",
    });
});
export const updateRecurrenceSchema = recurrenceSchema.extend({
  id: z.string().uuid(),
});
export const recurrenceStateSchema = z.object({
  tenantId: z.string().uuid(),
  id: z.string().uuid(),
  action: z.enum(["pause", "resume", "cancel"]),
});
export type RecurrenceInput = z.infer<typeof recurrenceSchema>;
