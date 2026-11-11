import { expect, test } from "@playwright/test";
import { openPage } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    let seed = 12345;
    Math.random = () => {
      seed = (seed * 1_664_525 + 1_013_904_223) >>> 0;
      return seed / 2 ** 32;
    };
  });
});

test("stock subscriptions wait for the interceptor to load", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  const interceptorBlocked = Promise.withResolvers<void>();
  let interceptorRequested = false;
  await page.route(/\/_astro\/WebSocket\.[^/]+\.js$/, async (route) => {
    interceptorRequested = true;
    await interceptorBlocked.promise;
    await route.continue();
  });

  try {
    await openPage(page, "/examples/stock-tickers/");
    await expect.poll(() => interceptorRequested).toBe(true);
    await page.clock.install();
    await page.clock.pauseAt(new Date());

    await page.getByRole("button", { name: "Connect", exact: true }).click();
    const stock = page
      .locator(".stocks")
      .first()
      .locator(".ticker-price")
      .first();
    const subscribe = stock.locator("button");
    await expect(subscribe).toBeDisabled();

    interceptorBlocked.resolve();
    await expect(subscribe).toBeEnabled();
    await subscribe.click();
    await page.clock.runFor(2_500);
    await expect(stock.locator(".ticker-value")).not.toHaveText("");
    expect(errors).toEqual([]);
  } finally {
    interceptorBlocked.resolve();
  }
});

test("stock feed loading failures are shown to the user", async ({ page }) => {
  await page.route(/\/_astro\/WebSocket\.[^/]+\.js$/, (route) =>
    route.abort("failed"),
  );
  await openPage(page, "/examples/stock-tickers/");

  await expect(page.getByRole("alert")).toContainText(
    "Unable to load the simulated price feed",
  );
  await expect(
    page.getByRole("button", { name: "Connect", exact: true }),
  ).toBeDisabled();
});

test("stock subscriptions share prices and clean up independently", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openPage(page, "/examples/stock-tickers/");
  await page.clock.install();
  await page.clock.pauseAt(new Date());

  const connect = page.getByRole("button", { name: "Connect", exact: true });
  const disconnect = page.getByRole("button", {
    name: "Disconnect",
    exact: true,
  });
  const stocks = page.locator(".stocks");
  const first = stocks.nth(0).locator(".ticker-price").first();
  const second = stocks.nth(1).locator(".ticker-price").first();

  await connect.click();
  await expect(first.locator("button")).toBeEnabled();
  await page.clock.runFor(100);
  await first.locator("button").click();
  await second.locator("button").click();
  await expect(disconnect).toBeDisabled();
  await page.clock.runFor(2_000);
  await expect(first.locator(".ticker-value")).not.toHaveText("");
  const firstPrice = await first.locator(".ticker-value").innerText();
  await expect(second.locator(".ticker-value")).toHaveText(firstPrice);

  await first.locator("button").click();
  await expect(first.locator(".ticker-value")).toHaveText("");
  await expect(second.locator(".ticker-value")).toHaveText(firstPrice);
  await page.clock.runFor(8_000);
  await expect(second.locator(".ticker-value")).not.toHaveText(firstPrice);

  await second.locator("button").click();
  await expect(disconnect).toBeEnabled();
  await disconnect.click();
  await expect(connect).toBeEnabled();
  await connect.click();
  await expect(first.locator("button")).toBeEnabled();
  await page.clock.runFor(100);
  await first.locator("button").click();
  await page.clock.runFor(2_500);
  await expect(first.locator(".ticker-value")).not.toHaveText("");
  expect(errors).toEqual([]);
});

test("a stock connection can be restarted before its socket opens", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openPage(page, "/examples/stock-tickers/");
  await page.clock.install();
  await page.clock.pauseAt(new Date());

  const connect = page.getByRole("button", { name: "Connect", exact: true });
  const disconnect = page.getByRole("button", {
    name: "Disconnect",
    exact: true,
  });
  const stock = page
    .locator(".stocks")
    .first()
    .locator(".ticker-price")
    .first();
  await connect.click();
  await expect(stock.locator("button")).toBeEnabled();
  await disconnect.click();
  await expect(connect).toBeEnabled();
  await connect.click();
  await expect(stock.locator("button")).toBeEnabled();
  await page.clock.runFor(100);
  await stock.locator("button").click();
  await page.clock.runFor(2_500);

  await expect(stock.locator(".ticker-value")).not.toHaveText("");
  expect(errors).toEqual([]);
});

test("fullscreen exits cleanly using Escape and the toggle", async ({
  page,
}) => {
  await openPage(page, "/examples/stock-tickers/");
  const toggle = page.getByTestId("full-screen-toggle").first();
  await toggle.scrollIntoViewIfNeeded();
  const scrollTop = await page.evaluate(
    () => document.documentElement.scrollTop,
  );

  await toggle.click();
  await expect(page.locator("body")).toHaveClass(/full-screen/);
  await page.keyboard.press("Escape");
  await expect(page.locator("body")).not.toHaveClass(/full-screen/);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollTop))
    .toBe(scrollTop);

  await toggle.click();
  await expect(page.locator("body")).toHaveClass(/full-screen/);
  await page.getByTestId("full-screen-toggle").click();
  await expect(page.locator("body")).not.toHaveClass(/full-screen/);
});

test("the wallet restores an invalid card after it is ejected", async ({
  page,
}) => {
  await openPage(page, "/quick-start/");
  await page.clock.install();
  await page.clock.pauseAt(new Date());

  const wallet = page.locator(".wallet");
  const card = wallet.locator(".bank-card").filter({ hasText: "1*?" });
  await card.click();
  await expect(card).toHaveClass(/hidden/);
  await expect(wallet.locator(".bank-card.inert")).toHaveCount(3);
  await expect(page.locator(".card-reader .bank-card")).toHaveText("1*?");

  await page.clock.runFor(6_000);
  await expect(card).not.toHaveClass(/hidden/);
  await expect(wallet.locator(".bank-card.inert")).toHaveCount(0);
  await expect(page.locator(".card-reader .bank-card")).toHaveCount(0);
});
