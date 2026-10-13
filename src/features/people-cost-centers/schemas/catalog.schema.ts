import { z } from "zod";

const base = {
  tenantId: z.string().uuid(),
  name: z
    .string()
    .trim()
    .min(1, "Informe um nome.")
    .max(120, "Use até 120 caracteres."),
  isActive: z.boolean().optional(),
};

export const personSchema = z.object({
  ...base,
  linkedUserId: z.string().uuid().nullable().optional().or(z.literal("")),
});
export const costCenterSchema = z.object({
  ...base,
  description: z.string().trim().max(500, "Use até 500 caracteres.").optional(),
});
export const catalogIdSchema = z.object({
  tenantId: z.string().uuid(),
  id: z.string().uuid(),
  isActive: z.boolean(),
});
export type PersonInput = z.infer<typeof personSchema>;
export type CostCenterInput = z.infer<typeof costCenterSchema>;
