import { expect, test } from "@playwright/test";

test("loads the neutral production shell", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole("heading", { name: "Agent-First Modular Monolith" }),
  ).toBeVisible();
});

test("returns only the safe health status", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ status: "ok" });
  expect(response.headers()["x-correlation-id"]).toBeTruthy();
});
