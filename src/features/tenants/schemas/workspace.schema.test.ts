import { describe, expect, it } from "vitest";
import { slugifyWorkspaceName, workspaceSchema } from "./workspace.schema";

describe("workspace schema", () => {
  it("creates a safe slug suggestion", () => {
    expect(slugifyWorkspaceName("Minha Família 2026")).toBe(
      "minha-familia-2026",
    );
  });

  it("accepts the local defaults", () => {
    expect(
      workspaceSchema.safeParse({
        name: "Minha família",
        slug: "minha-familia",
        type: "family",
        baseCurrency: "BRL",
        timezone: "America/Sao_Paulo",
      }).success,
    ).toBe(true);
  });

  it("rejects unsafe slugs", () => {
    expect(
      workspaceSchema.safeParse({
        name: "Teste",
        slug: "../private",
        type: "individual",
        baseCurrency: "BRL",
        timezone: "UTC",
      }).success,
    ).toBe(false);
  });
});
