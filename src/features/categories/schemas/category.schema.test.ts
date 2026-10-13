import { describe, expect, it } from "vitest";
import { createCategorySchema } from "./category.schema";

const tenantId = "10000000-0000-4000-8000-000000000001";

describe("categorySchema", () => {
  it("accepts a valid category", () => {
    expect(
      createCategorySchema.parse({ tenantId, name: "Moradia", type: "expense" })
        .name,
    ).toBe("Moradia");
  });
  it("accepts an empty parent for a root category", () => {
    expect(
      createCategorySchema.parse({
        tenantId,
        name: "Alimentação",
        type: "expense",
        parentId: "",
      }).parentId,
    ).toBe("");
  });
  it("rejects invalid colors", () => {
    expect(() =>
      createCategorySchema.parse({
        tenantId,
        name: "Moradia",
        type: "expense",
        color: "blue",
      }),
    ).toThrow();
  });
  it("rejects empty names", () => {
    expect(() =>
      createCategorySchema.parse({ tenantId, name: " ", type: "expense" }),
    ).toThrow();
  });
  it("keeps income and expense distinct", () => {
    expect(
      createCategorySchema.parse({ tenantId, name: "Salário", type: "income" })
        .type,
    ).toBe("income");
  });
});
