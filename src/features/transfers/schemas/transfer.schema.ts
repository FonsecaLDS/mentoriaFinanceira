import { z } from "zod";

const amount = z
  .string()
  .trim()
  .regex(
    /^\d+(?:[.,]\d{1,4})?$/,
    "Use um valor positivo com até 4 casas decimais.",
  );
export const transferSchema = z
  .object({
    tenantId: z.string().uuid(),
    sourceAccountId: z.string().uuid(),
    targetAccountId: z.string().uuid(),
    amount,
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, "Informe uma moeda válida."),
    effectiveDate: z.string().date("Informe uma data válida."),
    description: z
      .string()
      .trim()
      .max(200, "Use até 200 caracteres.")
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (value.sourceAccountId === value.targetAccountId)
      ctx.addIssue({
        code: "custom",
        path: ["targetAccountId"],
        message: "Escolha contas diferentes.",
      });
    if (value.effectiveDate > new Date().toISOString().slice(0, 10))
      ctx.addIssue({
        code: "custom",
        path: ["effectiveDate"],
        message: "A data não pode estar no futuro.",
      });
  });
export type TransferInput = z.infer<typeof transferSchema>;
