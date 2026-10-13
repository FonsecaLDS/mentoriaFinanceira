import { z } from "zod";

export const categoryTypeSchema = z.enum(["income", "expense"]);
export const budgetGroupSchema = z.enum([
  "fixed",
  "variable",
  "personal",
  "savings",
  "other",
]);
export const categoryIconSchema = z.enum([
  "briefcase-business",
  "gift",
  "circle-dollar-sign",
  "more-horizontal",
  "home",
  "utensils",
  "car",
  "heart-pulse",
  "graduation-cap",
  "gamepad-2",
  "shopping-bag",
  "concierge-bell",
  "wallet",
  "banknote",
]);

const nullableUuid = z.string().uuid().nullable().optional().or(z.literal(""));

const commonFields = {
  name: z
    .string()
    .trim()
    .min(1, "Informe um nome.")
    .max(80, "Use até 80 caracteres."),
  type: categoryTypeSchema,
  parentId: nullableUuid,
  budgetGroup: budgetGroupSchema.nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Use uma cor hexadecimal.")
    .nullable()
    .optional(),
  icon: categoryIconSchema.nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
};

export const createCategorySchema = z.object({
  tenantId: z.string().uuid(),
  ...commonFields,
});

export const updateCategorySchema = z.object({
  tenantId: z.string().uuid(),
  id: z.string().uuid(),
  ...commonFields,
});

export const categoryFiltersSchema = z.object({
  tenantId: z.string().uuid(),
  type: categoryTypeSchema.optional(),
  status: z.enum(["active", "inactive", "all"]).default("active"),
  search: z.string().trim().max(80).optional(),
});

export type CategoryInput = z.infer<typeof createCategorySchema>;
