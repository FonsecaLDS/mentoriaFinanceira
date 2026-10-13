import { z } from "zod";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const workspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe um nome.")
    .max(120, "Use até 120 caracteres."),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Use pelo menos 3 caracteres.")
    .max(80, "Use até 80 caracteres.")
    .regex(slugPattern, "Use letras minúsculas, números e hífens."),
  type: z.enum(["individual", "family", "business"]),
  baseCurrency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Use uma moeda ISO de 3 letras."),
  timezone: z.string().trim().min(1, "Selecione um fuso horário."),
});

export type WorkspaceInput = z.infer<typeof workspaceSchema>;

export function slugifyWorkspaceName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
