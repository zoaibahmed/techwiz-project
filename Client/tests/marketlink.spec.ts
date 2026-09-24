import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
const routes = {
  public: [
    "/",
    "/markets",
    "/markets/demo-m1",
    "/farmers",
    "/farmers/demo-f1",
    "/products",
    "/products/demo-p1",
    "/about",
    "/contact",
    "/help",
    "/login",
    "/register",
    "/register/customer",
    "/register/farmer",
    "/admin/login",
    "/basket",
    "/checkout",
  ],
  customer: [
    "/customer",
    "/customer/market-day",
    "/customer/orders",
    "/customer/orders/DEMO-1042",
    "/customer/orders/DEMO-1042/edit",
    "/customer/orders/DEMO-1030/review",
    "/customer/favourites",
    "/customer/notifications",
    "/customer/profile",
  ],
  farmer: [
    "/farmer",
    "/farmer/access",
    "/farmer/profile",
    "/farmer/markets",
    "/farmer/products",
    "/farmer/products/new",
    "/farmer/products/demo-p1/edit",
    "/farmer/stock",
    "/farmer/stock-templates",
    "/farmer/pickup-windows",
    "/farmer/orders",
    "/farmer/orders/DEMO-1042",
    "/farmer/pickups",
    "/farmer/insights",
    "/farmer/reviews",
    "/farmer/notifications",
  ],
  admin: [
    "/admin",
    "/admin/farmers",
    "/admin/farmers/demo-f3",
    "/admin/customers",
    "/admin/customers/demo-c1",
    "/admin/markets",
    "/admin/markets/new",
    "/admin/markets/demo-m1/edit",
    "/admin/moderation",
    "/admin/reports",
    "/admin/categories",
    "/admin/announcements",
    "/admin/notifications",
  ],
};
async function go(page: Page, path: string) {
  await page.evaluate((path) => {
    history.pushState({}, "", path);
    dispatchEvent(new PopStateEvent("popstate"));
  }, path);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await expect(page.locator("h1")).toBeVisible();
}
async function role(page: Page, name: string) {
  if (!(await page.locator(".demo-controls").isVisible()))
    await page
      .getByRole("button", { name: "Demo controls", exact: true })
      .click();
  await page
    .locator(".demo-controls")
    .getByRole("button", { name, exact: true })
    .click();
  await page
    .getByRole("button", { name: "Demo controls", exact: true })
    .click();
}
test("all public and role routes render with no runtime errors or narrow overflow", async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  for (const [name, paths] of Object.entries(routes)) {
    if (name !== "public") await role(page, name);
    for (const path of paths) {
      await go(page, path);
      await expect(page.locator("h1")).not.toContainText("needs a moment");
      await expect(page.locator(".demo-banner")).toBeVisible();
      for (const width of [1440, 390, 320]) {
        await page.setViewportSize({ width, height: 900 });
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          `${path} overflow at ${width}`,
        ).toBe(true);
      }
    }
  }
  expect(errors).toEqual([]);
});
test("discovery filters and market marker selection work", async ({ page }) => {
  await page.goto("/products");
  await page.getByRole("textbox", { name: "Search produce" }).fill("carrot");
  await expect(page.locator(".product-tile")).toHaveCount(2);
  await page.getByLabel("Available only").check();
  await expect(page.locator(".product-tile")).toHaveCount(1);
  await page.goto("/markets");
  await page
    .getByRole("button", { name: "Select Riverside Gathering", exact: true })
    .click();
  await expect(page.locator(".market-result.selected")).toContainText(
    "Riverside Gathering",
  );
  await page
    .getByRole("textbox", { name: "Search markets" })
    .fill("nothing matches");
  await expect(
    page.getByRole("heading", { name: "A different day, perhaps?" }),
  ).toBeVisible();
});
test("customer reserves, farmer accepts and prepares, customer sees the same order", async ({
  page,
}) => {
  await page.goto("/");
  await role(page, "customer");
  await go(page, "/products/demo-p1");
  await page
    .getByRole("button", { name: "Add to basket", exact: true })
    .click();
  await go(page, "/products/demo-p3");
  await page
    .getByRole("button", { name: "Add to basket", exact: true })
    .click();
  await go(page, "/checkout");
  await page
    .getByLabel("Pickup window for Good Earth Growers")
    .selectOption("demo-s1");
  await page
    .getByLabel("Pickup window for The Kitchen Garden")
    .selectOption("demo-s3");
  await page
    .getByRole("button", { name: "Confirm sample reservation" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your sample morning is planned." }),
  ).toBeVisible();
  await role(page, "farmer");
  await go(page, "/farmer/orders/DEMO-1042");
  await page.getByRole("button", { name: "Accept order", exact: true }).click();
  await page
    .getByRole("button", { name: "Confirm accept order", exact: true })
    .click();
  await expect(page.locator(".heading-actions")).toContainText("Accepted");
  await page.getByRole("button", { name: "Mark ready", exact: true }).click();
  await page
    .getByRole("button", { name: "Confirm mark ready", exact: true })
    .click();
  await role(page, "customer");
  await go(page, "/customer/orders/DEMO-1042");
  await expect(page.locator(".heading-actions")).toContainText(
    "Ready for pickup",
  );
});
test("cutoff, review eligibility and admin approval are visible and consistent", async ({
  page,
}) => {
  await page.goto("/");
  await role(page, "customer");
  await go(page, "/customer/orders/DEMO-1042/review");
  await expect(
    page.getByText("Reviews become available after this order is completed."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Demo controls", exact: true })
    .click();
  await page.getByRole("button", { name: "Toggle cutoff scenario" }).click();
  await page
    .getByRole("button", { name: "Demo controls", exact: true })
    .click();
  await go(page, "/customer/orders/DEMO-1042/edit");
  await expect(
    page.getByText(
      "This reservation cannot be edited in its current state or after its cutoff.",
    ),
  ).toBeVisible();
  await role(page, "admin");
  await go(page, "/admin/farmers/demo-f3");
  await page
    .getByRole("button", { name: "Approve farmer", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm approve farmer", exact: true })
    .click();
  await expect(page.locator(".heading-actions")).toContainText("Approved");
});
test("Copilot clearly labels simulation, sources and unavailability", async ({
  page,
}) => {
  await page.goto("/");
  await role(page, "customer");
  await go(page, "/customer");
  await page.getByRole("button", { name: "Copilot", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("No OpenAI connection");
  await page
    .getByRole("button", { name: "What tomatoes are available?" })
    .click();
  await expect(page.locator(".source-list")).toContainText("Vine tomatoes");
  await page.getByLabel("Simulate AI unavailable").check();
  await expect(
    page.getByText(
      "All ordinary filters, forms and order controls still work.",
      { exact: false },
    ),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
test("desktop and phone visual review artefacts", async ({ page }) => {
  test.setTimeout(90000);
  await page.goto("/");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: "test-results/home-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/home-mobile.png",
    fullPage: true,
  });
  for (const r of ["customer", "farmer", "admin"]) {
    await role(page, r);
    await go(page, `/${r}`);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({
      path: `test-results/${r}-desktop.png`,
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: `test-results/${r}-mobile.png`,
      fullPage: true,
    });
  }
});

test("farmer product editor and stock protection work through the browser", async ({
  page,
}) => {
  await page.goto("/");
  await role(page, "farmer");
  await go(page, "/farmer/products/new");
  await page.getByLabel("Product name").fill("Sample garden greens");
  await page.getByLabel("Sample unit price (PKR)").fill("150");
  await page.getByLabel("Sample Saturday published stock").fill("10");
  await page
    .getByLabel("Description", { exact: true })
    .fill("A fictional bunch for browser testing.");
  await page.getByRole("button", { name: "Save sample product" }).click();
  await expect(
    page.getByRole("heading", { name: "Sample garden greens" }),
  ).toBeVisible();
  await go(page, "/farmer/stock");
  const row = page.locator(".stock-row").filter({
    has: page.getByRole("heading", { name: "Vine tomatoes", exact: true }),
  });
  await row.getByLabel("Published", { exact: true }).fill("1");
  await row.getByRole("button", { name: "Save stock", exact: true }).click();
  await page
    .getByRole("button", { name: "Confirm save stock", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Stock cannot be below reservations",
  );
  await page.keyboard.press("Escape");
});
test("announcement preview does not publish before confirmation", async ({
  page,
}) => {
  await page.goto("/");
  await role(page, "admin");
  await go(page, "/admin/announcements");
  await page.getByLabel("Announcement title").fill("Sample market reminder");
  await page
    .getByLabel("Message", { exact: true })
    .fill("Check your pickup window before leaving.");
  await page
    .getByRole("button", { name: "Preview announcement", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Sample market reminder", exact: true }),
  ).toHaveCount(1);
  await page
    .getByRole("button", { name: "Publish sample announcement", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Confirm publish sample announcement",
      exact: true,
    })
    .click();
  await go(page, "/");
  await expect(
    page.locator(".notice").filter({ hasText: "Sample market reminder" }),
  ).toBeVisible();
  await role(page, "customer");
  await go(page, "/customer/notifications");
  await expect(
    page.getByRole("link", { name: "Sample market reminder" }),
  ).toBeVisible();
});
test("farmer Copilot previews stock before explicit confirmation", async ({
  page,
}) => {
  await page.goto("/");
  await role(page, "farmer");
  await go(page, "/farmer");
  await page.getByRole("button", { name: "Copilot", exact: true }).click();
  await page
    .getByRole("button", { name: "Preview a stock change", exact: true })
    .click();
  await expect(page.locator(".draft-preview")).toBeVisible();
  await page
    .getByRole("button", { name: "Apply sample change", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm apply sample change", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Close Copilot", exact: true })
    .click();
  await go(page, "/farmer/stock");
  await expect(
    page.locator(".stock-row").filter({
      has: page.getByRole("heading", { name: "Vine tomatoes", exact: true }),
    }),
  ).toContainText("Unavailable");
});
