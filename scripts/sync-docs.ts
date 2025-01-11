import { readdir, readFile, writeFile } from "node:fs/promises";
import { type Locator, chromium, devices } from "playwright";

interface PackageMetadata {
  url: string;
  package: string; // foo@1.2.3
  time: string; // ISO
}

type PackagesMetadata = Record<string, PackageMetadata>;

const docsDir = "docs";
const assetsDir = `${docsDir}/assets`;
const metadataFile = `${assetsDir}/bundlephobia-metadata.json`;

const args = process.argv.slice(2);
const dryRun = args.includes("--dryRun");

// biome-ignore lint/suspicious/noExplicitAny: CLI output
const log = (message: string, ...args: any[]) => console.log(message, ...args);

const readMetadata = async (): Promise<PackagesMetadata> => await Bun.file(metadataFile).json();

const indexMetadata = (metadata: PackagesMetadata): Record<string, [string, keyof PackageMetadata]> => {
  return Object.fromEntries(
    Object.entries(metadata).flatMap(([packageName, packageMetadata]) =>
      Object.entries(packageMetadata).map(([key, value]) => [value, [packageName, key]]),
    ),
  );
};

const takeScreenshot = async (locator: Locator, fileName: string) => {
  const screenshotFile = `${assetsDir}/${fileName}`;
  log("saving screenshot file", screenshotFile);
  if (!dryRun) {
    await locator.waitFor();
    await locator.screenshot({ animations: "disabled", path: screenshotFile });
  }
};

const captureBundlephobiaStats = async (): Promise<PackagesMetadata> => {
  log("launching browser");
  const browser = await chromium.launch();
  const context = await browser.newContext(devices["Desktop Chrome"]);
  const page = await context.newPage();

  const logoSmall = page.locator(".logo-small");
  const statsContainer = page.locator(".stats-container");
  const autocompleteInput = page.locator(".autocomplete-input");

  const newMetadata: PackagesMetadata = {};
  for (const packageName of ["xstate", "yay-machine"]) {
    const url = `https://bundlephobia.com/package/${packageName}@latest`;
    log(`opening url: ${url}`);
    await page.goto(url);
    await takeScreenshot(logoSmall, "bundlephobia-logo.png");

    await statsContainer.waitFor();
    autocompleteInput.waitFor();
    const [name, version] = (await autocompleteInput.inputValue()).split("@");

    const screenshotFile = `bundlephobia-${name}.png`;
    await takeScreenshot(statsContainer, screenshotFile);
    newMetadata[packageName] = {
      url: page.url().replace("@latest", `@${version}`),
      package: `${packageName}@${version}`,
      time: new Date().toISOString(),
    };
  }

  log("writing metadata", metadataFile, newMetadata);
  if (!dryRun) {
    await writeFile(`${assetsDir}/bundlephobia-metadata.json`, JSON.stringify(newMetadata, undefined, "  "));
  }

  await context.close();
  await browser.close();
  return newMetadata;
};

const previousMetadata = await readMetadata();
log("previous metadata", previousMetadata, indexMetadata(previousMetadata));

const newMetadata = await captureBundlephobiaStats();

for (const file of await readdir(docsDir, { recursive: true, withFileTypes: true })) {
  if (!file.isFile()) {
    continue;
  }
  if (file.name.startsWith("assets") || !file.name.endsWith(".md")) {
    continue;
  }

  const fileName = `${file.parentPath}/${file.name}`;
  const content = (await readFile(fileName, { encoding: "utf8" })).toString();
  log(fileName);
  let newContent = content;
  for (const [text, [packageName, key]] of Object.entries(indexMetadata(previousMetadata))) {
    if (newContent.includes(text)) {
      const replacement = newMetadata[packageName][key];
      log(`${fileName}: "${text}" => "${replacement}`);
      newContent = newContent.replaceAll(text, replacement);
    }
  }
  if (newContent !== content) {
    log(`writing ${fileName}`);
    if (!dryRun) {
      await writeFile(fileName, newContent);
    }
  } else {
    log("up-to-date");
  }
}
