import { describe, expect, it } from "vitest";

import { isInternalPath } from "./lib/auth-errors";
import { loginSchema, registerSchema } from "./schemas";

describe("auth validation", () => {
  it("normalizes a valid login e-mail", () => {
    expect(
      loginSchema.parse({
        email: "  USER@EXAMPLE.COM ",
        password: "password8",
      }),
    ).toEqual({
      email: "user@example.com",
      password: "password8",
    });
  });

  it("rejects mismatched registration passwords", () => {
    expect(() =>
      registerSchema.parse({
        fullName: "Pessoa Teste",
        email: "user@example.com",
        password: "password8",
        confirmPassword: "different8",
      }),
    ).toThrow();
  });

  it("accepts only internal redirect paths", () => {
    expect(isInternalPath("/t/example/dashboard")).toBe(true);
    expect(isInternalPath("https://example.com")).toBe(false);
    expect(isInternalPath("//example.com")).toBe(false);
  });
});
