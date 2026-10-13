import { z } from "zod";
import { currencySchema } from "@/features/accounts/schemas/account.schema";

const amount = z
  .string()
  .trim()
  .regex(
    /^\d+(?:[.,]\d{1,4})?$/,
    "Informe um valor positivo com até 4 casas decimais.",
  );
export const goalSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  targetAmount: amount,
  currency: currencySchema,
  targetDate: z.string().date().nullable().optional(),
});
export const updateGoalSchema = goalSchema.extend({
  id: z.string().uuid(),
  status: z.enum(["active", "completed", "archived"]),
});
export const reserveSchema = z.object({
  tenantId: z.string().uuid(),
  goalId: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(1).max(120),
  currency: currencySchema,
});
export const reserveMovementSchema = z.object({
  tenantId: z.string().uuid(),
  reserveId: z.string().uuid(),
  accountId: z.string().uuid(),
  amount,
  effectiveDate: z.string().date(),
});

export type GoalInput = z.infer<typeof goalSchema>;
export type ReserveInput = z.infer<typeof reserveSchema>;
export type ReserveMovementInput = z.infer<typeof reserveMovementSchema>;
