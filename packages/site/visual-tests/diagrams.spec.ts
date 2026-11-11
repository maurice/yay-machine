import { readdirSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Locator } from "@playwright/test";
import { openPage } from "./helpers";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const routes = readdirSync(dist, { recursive: true, withFileTypes: true })
  .filter(
    (entry) =>
      entry.isFile() &&
      entry.name.endsWith(".html") &&
      entry.name !== "404.html",
  )
  .map((entry) => {
    const path = relative(dist, resolve(entry.parentPath, entry.name))
      .split(sep)
      .join("/");
    return `/${entry.name === "index.html" ? path.slice(0, -entry.name.length) : path}`;
  })
  .toSorted();

if (!routes.includes("/")) {
  throw new Error("Build the static docs site before running site:test.");
}

const captureDiagram = async (diagram: Locator, name: string) => {
  await expect(diagram).toBeVisible();
  await expect(diagram.locator("ym-state").first()).toBeVisible();
  await expect(diagram.locator("svg")).toHaveAttribute(
    "width",
    /^(?!0$)\d+(?:\.\d+)?$/,
  );
  expect(await diagram.locator("path.line").count()).toBeGreaterThan(0);
  await expect
    .poll(() =>
      diagram.locator("path.line").evaluateAll((paths) =>
        paths.every((path) => {
          const d = path.getAttribute("d");
          return !!d && !/NaN|Infinity/.test(d);
        }),
      ),
    )
    .toBe(true);
  await expect.soft(diagram.locator(".chart")).toHaveScreenshot(name);
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Math.random = () => 0.5;
    // Dagre must not measure state bounds partway through a wiggle animation.
    // oxlint-disable-next-line typescript/unbound-method -- always invoked via `.call(this, ...)` below
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (keyframes, options) {
      const animation = animate.call(this, keyframes, options);
      animation.finish();
      return animation;
    };
  });
});

test("all diagrams in the built documentation", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const inventory: Record<string, number> = {};

  for (const route of routes) {
    await test.step(route, async () => {
      await openPage(page, route);
      const diagrams = page.locator("ym-chart");
      const count = await diagrams.count();
      if (count > 0) {
        inventory[route] = count;
      }
      for (let index = 0; index < count; index++) {
        const name = `${route.slice(1).replaceAll("/", "-") || "index-"}diagram-${index + 1}.png`;
        await captureDiagram(diagrams.nth(index), name);
      }
    });
  }

  expect(Object.keys(inventory).length).toBeGreaterThan(0);
  expect(`${JSON.stringify(inventory, undefined, 2)}\n`).toMatchSnapshot(
    "diagram-inventory.json",
  );
  expect(errors, "No client-side errors while rendering diagrams").toEqual([]);
});

test("stock ticker dynamically generated price diagram", async ({ page }) => {
  await openPage(page, "/examples/stock-tickers/");
  await expect(page.locator("ym-chart")).toHaveCount(1);
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await page.clock.runFor(100);
  await page.locator(".ticker-subscribe-unsubscribe button").first().click();
  await page.clock.runFor(500);
  const diagrams = page.locator("ym-chart");
  await expect(diagrams).toHaveCount(2);
  await captureDiagram(
    diagrams.nth(1),
    "examples-stock-tickers-price-diagram.png",
  );
});
