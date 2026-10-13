import { describe, expect, it } from "vitest";
import { transactionSchema } from "./transaction.schema";

const valid = {
  tenantId: "00000000-0000-4000-8000-000000000001",
  type: "expense",
  description: "Mercado",
  amount: "120,50",
  currency: "BRL",
  categoryId: "",
  personId: "",
  costCenterId: "",
  accountId: "",
  competenceDate: "2026-10-10",
  dueDate: "2026-10-12",
  status: "pending",
  notes: "",
};

describe("transaction schema", () => {
  it("accepts a valid pending expense", () =>
    expect(transactionSchema.safeParse(valid).success).toBe(true));
  it("rejects negative and over-precise amounts", () => {
    expect(
      transactionSchema.safeParse({ ...valid, amount: "-1" }).success,
    ).toBe(false);
    expect(
      transactionSchema.safeParse({ ...valid, amount: "1.12345" }).success,
    ).toBe(false);
  });
  it("rejects due date before competence", () =>
    expect(
      transactionSchema.safeParse({ ...valid, dueDate: "2026-10-09" }).success,
    ).toBe(false));
  it("does not accept paid status from the form", () =>
    expect(
      transactionSchema.safeParse({ ...valid, status: "paid" }).success,
    ).toBe(false));
});
