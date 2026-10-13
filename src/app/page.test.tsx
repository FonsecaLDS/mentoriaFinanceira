import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("home page", () => {
  it("renders the technical foundation message", () => {
    render(<Home />);
    expect(screen.getByText("Mentoria Financeira")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /explorar a base/i }),
    ).toBeInTheDocument();
  });
});
