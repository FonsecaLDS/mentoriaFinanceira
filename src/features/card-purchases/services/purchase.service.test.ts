import { describe, expect, it } from "vitest";
import { previewInstallments } from "./purchase.service";

describe("previewInstallments", () => {
  it("distributes the remainder without losing units", () => {
    expect(previewInstallments("100.00", 3)).toEqual([
      "33.3334",
      "33.3333",
      "33.3333",
    ]);
  });

  it("preserves small values", () => {
    expect(previewInstallments("0.01", 2)).toEqual(["0.0050", "0.0050"]);
  });
});
