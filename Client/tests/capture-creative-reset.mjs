import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

// Run with the app already serving on 5173. Outputs stay in ignored test-results.
await mkdir("test-results/creative-reset-video", { recursive: true });
const browser = await chromium.launch({ channel: "msedge" });
const context = await browser.newContext({
  viewport: { width: 1440, height: 960 },
  recordVideo: {
    dir: "test-results/creative-reset-video",
    size: { width: 1440, height: 960 },
  },
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto("http://127.0.0.1:5173/");
  await page.locator("h1").waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1800);
  await page.screenshot({
    path: "test-results/creative-home-desktop-viewport.png",
  });
  for (let i = 0; i < 12; i++) {
    await page.mouse.wheel(0, 65);
    await page.waitForTimeout(90);
  }
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: "Sun 4 Oct", exact: true }).click();
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "Sat 3 Oct", exact: true }).click();
  await page.waitForTimeout(700);
  await page
    .getByRole("button", { name: "Select Riverside Gathering", exact: true })
    .click();
  await page.waitForTimeout(800);
  await page
    .getByRole("button", { name: "Select The Orchard Market", exact: true })
    .click();
  await page.waitForTimeout(600);
  await page
    .locator(".grower-switcher")
    .getByRole("button", { name: /The Kitchen Garden/ })
    .click();
  await page.waitForTimeout(700);
  await page.locator(".bench-details").scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: /Add to my market bag/ }).click();
  await page.waitForTimeout(1100);
  await page
    .locator(".bag-confirmation")
    .getByRole("link", { name: "Review bag" })
    .click();
  await page.waitForTimeout(900);
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
  await page
    .getByRole("heading", { name: "Your market day, in view." })
    .waitFor();
  await page.waitForTimeout(900);
  if (
    await page.getByRole("button", { name: "Dismiss notification" }).isVisible()
  )
    await page.getByRole("button", { name: "Dismiss notification" }).click();
  await page.evaluate(() => scrollTo(0, 0));
  await page.getByRole("button", { name: "Ready (1)", exact: true }).click();
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "All (2)", exact: true }).click();
  await context.close();
  await page.video().saveAs("test-results/marketlink-creative-reset.webm");

  const stills = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  const shot = await stills.newPage();
  await shot.goto("http://127.0.0.1:5173/");
  await shot.locator("h1").waitFor();
  await shot.evaluate(() => document.fonts.ready);
  await shot.locator(".stall-person").scrollIntoViewIfNeeded();
  await shot.locator(".stall-person img").evaluate((img) => img.decode());
  await shot.evaluate(() => scrollTo(0, 0));
  await shot.screenshot({
    path: "test-results/creative-home-desktop.png",
    fullPage: true,
  });
  for (const width of [390, 320]) {
    await shot.setViewportSize({ width, height: 900 });
    await shot.evaluate(() => scrollTo(0, 0));
    await shot.screenshot({
      path: `test-results/creative-home-${width}.png`,
      fullPage: true,
    });
    await shot.screenshot({
      path: `test-results/creative-home-${width}-viewport.png`,
    });
  }
  await shot
    .getByRole("button", { name: "Demo controls", exact: true })
    .click();
  await shot
    .locator(".demo-controls")
    .getByRole("button", { name: "customer", exact: true })
    .click();
  await shot
    .getByRole("button", { name: "Demo controls", exact: true })
    .click();
  await shot.evaluate(() => {
    history.pushState({}, "", "/customer");
    dispatchEvent(new PopStateEvent("popstate"));
  });
  await shot
    .getByRole("heading", { name: "Your market day, in view." })
    .waitFor();
  if (
    await shot.getByRole("button", { name: "Dismiss notification" }).isVisible()
  )
    await shot.getByRole("button", { name: "Dismiss notification" }).click();
  for (const width of [1440, 390, 320]) {
    await shot.setViewportSize({ width, height: 900 });
    await shot.evaluate(() => scrollTo(0, 0));
    await shot.screenshot({
      path: `test-results/creative-customer-${width}.png`,
      fullPage: true,
    });
    if (width === 1440)
      await shot.screenshot({
        path: "test-results/creative-customer-desktop.png",
        fullPage: true,
      });
  }
  await stills.close();
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(
    "Recorded real app interaction video and desktop/390/320 screenshots.",
  );
} finally {
  await browser.close();
}
