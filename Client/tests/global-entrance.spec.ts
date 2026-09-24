import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: '{"error":{"message":"Isolated frontend test"}}',
    }),
  );
});
test("first visit is dismissible, persists, and does not silently select Pakistan", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".coverage-empty")).toContainText(
    "Choose your country",
  );
  await page.reload();
  await expect(page.locator("h1")).toBeVisible();
  await page.waitForTimeout(600);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("marketlink.visitor.v1")!).country,
    ),
  ).toBe("");
});
test("worldwide country search, empty discovery and Urdu preference survive reload", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Country or territory", { exact: true }).fill("Japan");
  await page.locator(".country-item").filter({ hasText: "Japan" }).click();
  await page
    .getByRole("button", { name: "Explore this location", exact: true })
    .click();
  await expect(page.locator(".coverage-empty")).toContainText("Japan");
  await expect(page.locator(".explorer-market-choice")).toHaveCount(0);
  for (const path of [
    "/markets",
    "/products",
    "/farmers",
    "/markets/demo-m1",
  ]) {
    await page.goto(path);
    await expect(page.locator(".coverage-empty")).toContainText("Japan");
    await expect(page.locator("main")).not.toContainText("The Orchard Market");
  }
  await page.goto("/");
  await page.locator(".hero-location").click();
  await page.locator(".lang-btn").filter({ hasText: "اردو" }).click();
  await page.locator(".apply-btn").click();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("h1")).toContainText("اچھی غذا");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "ur");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  }
});
test("chosen market day persists and an empty harvest never falls back to unrelated stock", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator(".demo-switch-btn").click();
  await page.getByRole("button", { name: "Sun 4 Oct", exact: true }).click();
  await expect(page.locator(".bench-empty")).toBeVisible();
  await expect(page.locator(".bench-add")).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Sun 4 Oct", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".bench-empty")).toBeVisible();
});
