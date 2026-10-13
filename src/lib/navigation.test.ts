import { describe, expect, it } from "vitest";
import { navigationItems } from "./navigation";

describe("app navigation", () => {
  it("keeps every route scoped to the selected tenant", () => {
    expect(
      navigationItems.every((item) =>
        item.href("familia").startsWith("/t/familia/"),
      ),
    ).toBe(true);
  });

  it("exposes the four linked mobile actions plus the More action", () => {
    expect(
      navigationItems.filter((item) => item.mobile).map((item) => item.label),
    ).toEqual(["Dashboard", "Transações", "Contas", "Cartões"]);
  });
});
