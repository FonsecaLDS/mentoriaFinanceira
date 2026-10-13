import { describe, expect, it } from "vitest";
import { getMonthBounds } from "./dashboard.service";

describe("getMonthBounds", () => {
  it("returns the exact boundaries of a selected month", () => {
    expect(getMonthBounds("2024-02")).toEqual({
      from: "2024-02-01",
      to: "2024-02-29",
    });
  });

  it("falls back to the current month for invalid input", () => {
    expect(getMonthBounds("invalid", new Date("2026-10-10T12:00:00Z"))).toEqual(
      {
        from: "2026-10-01",
        to: "2026-10-31",
      },
    );
  });
});
