import { expect, test } from '@playwright/test';

test('preparation shell renders without errors or API traffic at desktop and mobile widths', async ({ page }) => {
  const errors: string[] = [];
  const apiRequests: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if (['fetch', 'xhr'].includes(request.resourceType())) apiRequests.push(request.url());
  });
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Ready for the brief.' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  expect(errors).toEqual([]);
  expect(apiRequests).toEqual([]);
});
