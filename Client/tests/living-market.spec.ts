import { test, expect } from "@playwright/test";

test("customer market day connects dates, map, harvest, basket and companion", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Demo controls", exact: true })
    .click();
  await page
    .locator(".demo-controls")
    .getByRole("button", { name: "customer", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Demo controls", exact: true })
    .click();
  await page
    .getByRole("link", { name: "My workspace", exact: true })
    .first()
    .click();
  await expect(page.locator(".agenda-stop")).toHaveCount(2);
  await page.getByRole("button", { name: "Focus Riverside Gathering" }).click();
  await expect(
    page.getByRole("button", {
      name: "Select Riverside Gathering",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Dashboard market day").selectOption("2026-10-04");
  await expect(page.locator(".agenda-stop")).toHaveCount(0);
  await expect(page.locator(".studio-harvest .harvest-item")).toHaveCount(0);
  await expect(
    page.getByRole("button", {
      name: "Select Sunday at the Grove",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Dashboard market day").selectOption("2026-10-03");
  await page.getByLabel("Search dashboard produce").fill("tomato");
  await expect(page.locator(".studio-harvest .harvest-item")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Add Vine tomatoes to basket" })
    .click();
  await expect(
    page.getByRole("link", { name: "Basket, 1 items" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ask your companion" }).click();
  await expect(page.getByRole("dialog")).toContainText("No OpenAI connection");
  await page.keyboard.press("Escape");
  await page.getByLabel("Search dashboard produce").fill("");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => document.fonts.ready);
  if (
    await page.getByRole("button", { name: "Dismiss notification" }).isVisible()
  )
    await page.getByRole("button", { name: "Dismiss notification" }).click();
  for (const [name, width] of [
    ["desktop", 1440],
    ["mobile", 390],
  ] as const) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(page.locator("h1")).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/living-customer-${name}.png`,
      fullPage: true,
    });
  }
});

test("public market finder preserves the chosen day and neighbourhood", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  for (const [name, width] of [
    ["desktop", 1440],
    ["mobile", 390],
  ] as const) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `test-results/living-home-${name}.png`,
      fullPage: true,
    });
  }
  await page.getByLabel("Find a neighbourhood").fill("Riverside");
  await page.getByRole("button", { name: "Find my market" }).click();
  await expect(page.locator(".market-result")).toHaveCount(1);
  await expect(page.locator(".market-result.selected")).toContainText(
    "Riverside Gathering",
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Zoom in map" }).click();
  await expect(
    page.getByRole("button", { name: "Zoom in map" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Zoom out map" }).click();
  await expect(
    page.getByRole("button", { name: "Zoom out map" }),
  ).toBeDisabled();
});
