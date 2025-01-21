import { cwd } from "node:process";
import { chromium, devices } from "playwright";
import sharp from "sharp";

const assetsDir = "assets";

const log = (message: string) => {
  process.stdout.write(`${message}\n`);
};

const scapeLogo = async () => {
  log("launching browser");
  const browser = await chromium.launch();
  const context = await browser.newContext(devices["Desktop Chrome"]);
  const page = await context.newPage();
  await page.goto(`file://${cwd()}/scripts/logo.html`);

  log("waiting for rendered text");
  const renderedText = page.locator("span.logo-font");
  await renderedText.waitFor();

  const paddedScreenshotFile = `${assetsDir}/logo-padded.png`;
  log(`saving screenshot file: ${paddedScreenshotFile}`);

  await renderedText.screenshot({
    animations: "disabled",
    path: paddedScreenshotFile,
    omitBackground: true,
  });

  log("closing browser");
  await context.close();
  await browser.close();

  log("trimming");
  const trimmedScreenshotFile = `${assetsDir}/logo.png`;
  await sharp(paddedScreenshotFile).trim().toFile(trimmedScreenshotFile);
};

await scapeLogo();
