import { expect, test } from "@playwright/test";

test("home page loads without horizontal overflow on a narrow viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/");

  await expect(page).toHaveTitle("Mentoria Financeira");
  await expect(
    page.getByRole("heading", {
      name: "Um espaço claro para cuidar das suas finanças.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Começar a organizar" }),
  ).toHaveAttribute("href", "/register");
  await expect(
    page.getByRole("link", { name: "Já tenho uma conta" }),
  ).toHaveAttribute("href", "/login");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
});
