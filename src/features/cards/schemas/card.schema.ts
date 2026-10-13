import { z } from "zod";
import { currencySchema } from "@/features/accounts/schemas/account.schema";

const fields = {
  tenantId: z.string().uuid(),
  name: z.string().trim().min(1, "Informe um nome.").max(120),
  institutionName: z.string().trim().max(120).optional(),
  creditLimit: z
    .string()
    .trim()
    .regex(
      /^\d+(?:[.,]\d{1,4})?$/,
      "Informe um limite não negativo com até 4 casas decimais.",
    ),
  currency: currencySchema,
  closingDay: z.number().int().min(1).max(31),
  dueDay: z.number().int().min(1).max(31),
  paymentAccountId: z.string().uuid().nullable().optional().or(z.literal("")),
};
export const cardSchema = z.object(fields);
export const updateCardSchema = cardSchema.extend({ id: z.string().uuid() });
export const cardStateSchema = z.object({
  tenantId: z.string().uuid(),
  id: z.string().uuid(),
  isActive: z.boolean(),
});
export type CardInput = z.infer<typeof cardSchema>;
