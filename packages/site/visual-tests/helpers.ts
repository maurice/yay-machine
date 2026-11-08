import { expect, type Page } from "@playwright/test";

export const openPage = async (page: Page, route: string) => {
  const response = await page.goto(route);
  expect(response?.ok(), `Static page ${route} should load`).toBe(true);
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
};
