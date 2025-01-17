import { chromium, devices } from "playwright";

const assetsDir = "assets";

const log = (message: string) => {
  process.stdout.write(`${message}\n`);
};

const scapeLogo = async () => {
  log("launching browser");
  const browser = await chromium.launch();
  const context = await browser.newContext(devices["Desktop Chrome"]);
  const page = await context.newPage();
  await page.goto(
    "https://fonts.google.com/specimen/Nabla?preview.text=yay-machine%20&categoryFilters=Feeling:%2FExpressive%2FFuturistic",
  );

  log("waiting for rendered text");
  const renderedText = page.locator("[contenteditable][spellcheck=false]");
  await renderedText.waitFor();

  const screenshotFile = `${assetsDir}/logo.png`;
  log(`saving screenshot file: ${screenshotFile}\n`);

  await renderedText.screenshot({
    animations: "disabled",
    path: screenshotFile,
    omitBackground: true,
  });

  await context.close();
  await browser.close();
};

await scapeLogo();
