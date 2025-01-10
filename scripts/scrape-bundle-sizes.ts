import { type Locator, chromium, devices } from "playwright";

const assetsDir = "docs/assets/";

// biome-ignore lint/suspicious/noExplicitAny: CLI output
const log = (message: string, ...args: any[]) => console.log(message, ...args);

const takeScreenshot = async (locator: Locator, fileName: string) => {
  await locator.waitFor();
  await locator.screenshot({ animations: "disabled", path: `${assetsDir}/${fileName}` });
};

(async () => {
  log("launching browser");
  const browser = await chromium.launch();
  const context = await browser.newContext(devices["Desktop Chrome"]);
  const page = await context.newPage();

  const logoSmall = page.locator(".logo-small");
  const statsContainer = page.locator(".stats-container");
  const autocompleteInput = page.locator(".autocomplete-input");

  for (const packageName of ["xstate@latest", "yay-machine@1.1.3"]) {
    const url = `https://bundlephobia.com/package/${packageName}`;
    log(`opening url: ${url}`);
    await page.goto(url);
    await takeScreenshot(logoSmall, "bundlephobia-logo.png");

    await statsContainer.waitFor();
    autocompleteInput.waitFor();
    const [name, version] = (await autocompleteInput.inputValue()).split("@");

    await takeScreenshot(statsContainer, `${name}-bundlephobia-stats.png`);
    Bun.write(
      `${assetsDir}/${name}-bundlephobia-metadata.json`,
      JSON.stringify({ name, version, time: new Date().toISOString() }, undefined, "  "),
    );
  }

  log("done");
  await context.close();
  await browser.close();
})();
