import { test, expect } from "@playwright/test";

test("homepage selection connects market, growers, produce and basket", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Step into the market" }).click();
  await expect(page.locator(".explorer-heading")).toBeInViewport();
  await page.getByRole("button", { name: "Sun 4 Oct", exact: true }).click();
  await expect(page.locator(".selected-market-ribbon")).toContainText(
    "Sunday at the Grove",
  );
  await expect(page.locator(".bench-empty")).toBeVisible();
  await expect(page.locator(".bench-add")).toHaveCount(0);
  await page.getByRole("button", { name: "Sat 3 Oct", exact: true }).click();
  await page
    .getByRole("button", { name: "Select Riverside Gathering", exact: true })
    .click();
  await expect(page.locator(".explorer-market-choice.selected")).toContainText(
    "Riverside Gathering",
  );
  await expect(page.locator(".grower-switcher button")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Select The Orchard Market", exact: true })
    .click();
  await page
    .locator(".grower-switcher")
    .getByRole("button", { name: /The Kitchen Garden/ })
    .click();
  await expect(page.locator(".bench-details")).toContainText(
    "Mixed harvest basket",
  );
  await expect(page.locator(".bench-pickup")).toContainText("10:00–11:00");
  await page
    .locator(".grower-switcher")
    .getByRole("button", { name: /Good Earth Growers/ })
    .click();
  await page
    .getByRole("button", { name: "Increase reservation quantity" })
    .click();
  await page.getByRole("button", { name: /Add to my market bag/ }).click();
  await expect(page.locator(".market-bag-dock")).toContainText("2");
  await expect(page.locator(".bag-confirmation")).toContainText(
    "Added to your sample market bag",
  );
  await page
    .getByRole("link", { name: "Review basket & plan collection" })
    .click();
  await expect(page.locator("h1")).toContainText("basket");
  await expect(page.locator("main")).toContainText("Vine tomatoes");
});

test("scroll motion changes the scene and reduced motion removes the transform", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await page.locator(".arrival-stage").waitFor();
  await page.waitForTimeout(1500); // Allow the deliberately choreographed entrance to settle.
  const before = await page
    .locator(".arrival-stage")
    .evaluate((e) => getComputedStyle(e).transform);
  await page.mouse.wheel(0, 520);
  await expect
    .poll(() =>
      page
        .locator(".arrival-stage")
        .evaluate((e) => getComputedStyle(e).transform),
    )
    .not.toBe(before);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".arrival-stage")).toHaveCSS("transform", "none");
  await page.getByRole("button", { name: "Sun 4 Oct", exact: true }).click();
  await expect(page.locator(".selected-market-ribbon")).toContainText(
    "Sunday at the Grove",
  );
});

test("new screens fit small mobile and expose named controls", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.locator("h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  }
  const unnamed = await page
    .locator("main button")
    .evaluateAll(
      (buttons) =>
        buttons.filter(
          (b) => !b.getAttribute("aria-label") && !b.textContent?.trim(),
        ).length,
    );
  expect(unnamed).toBe(0);
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
  await page.evaluate(() => {
    history.pushState({}, "", "/customer");
    dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect(
    page.getByRole("heading", { name: "Your market day, in view." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ready (1)", exact: true }).click();
  await expect(page.locator(".command-pickup")).toHaveCount(1);
  await page.getByLabel("Pack a reusable bag").check();
  await expect(page.locator(".command-checklist")).toContainText("1/3");
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  }
});
