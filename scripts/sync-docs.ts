import { readFile, readdir, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import { type Locator, chromium, devices } from "playwright";

interface PackageMetadata {
  url: string;
  package: string; // foo@1.2.3
  time: string; // ISO
}

type PackagesMetadata = Record<string, PackageMetadata>;

const docsDir = "packages/site/src/content/docs";
const assetsDir = "packages/site/src/assets";
const metadataFile = `${assetsDir}/bundlephobia-metadata.json`;

const args = process.argv.slice(2);
const dryRun = args.includes("--dryRun");
const includeBundlephobia = args.includes("--includeBundlephobia");

const log = (message: string, ...args: any[]) => console.log(message, ...args);

const readMetadata = async (): Promise<PackagesMetadata> =>
  await Bun.file(metadataFile).json();

const indexMetadata = (
  metadata: PackagesMetadata,
): Record<string, [string, keyof PackageMetadata]> => {
  return Object.fromEntries(
    Object.entries(metadata).flatMap(([packageName, packageMetadata]) =>
      Object.entries(packageMetadata).map(([key, value]) => [
        value,
        [packageName, key],
      ]),
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

  await context.close();
  await browser.close();
  return newMetadata;
};

const previousMetadata = await readMetadata();
log("previous metadata", previousMetadata, indexMetadata(previousMetadata));

const newMetadata = !includeBundlephobia
  ? previousMetadata
  : await captureBundlephobiaStats();

let didChange = false;
const files = (await readdir(docsDir, { recursive: true, withFileTypes: true }))
  .filter(
    (it) =>
      it.isFile() && (it.name.endsWith(".md") || it.name.endsWith(".mdx")),
  )
  .map((it) => `${it.parentPath}/${it.name}`)
  .concat(["packages/yay-machine/README.md"]);
for (const fileName of files) {
  log(fileName);
  const content = (await readFile(fileName, { encoding: "utf8" })).toString();

  // update any scraped text
  let newContent = content;
  for (const [text, [packageName, key]] of Object.entries(
    indexMetadata(previousMetadata),
  )) {
    if (newContent.includes(text)) {
      const replacement = newMetadata[packageName][key];
      if (text === replacement) {
        continue;
      }
      log(`${fileName}: "${text}" => "${replacement}`);
      newContent = newContent.replaceAll(text, replacement);
      didChange = true;
    }
  }

  // update example code
  /*
  View this example's <a href="https://github.com/maurice/yay-machine/blob/main/packages/example-machines/src/healthMachine.ts" target="_blank">source</a> and <a href="https://github.com/maurice/yay-machine/blob/main/packages/example-machines/src/__tests__/healthMachine.test.ts" target="_blank">test</a> on GitHub
  */
  let lastIndex = 0;
  while (true) {
    const index = newContent.indexOf("View this example's <a href", lastIndex);
    if (index === -1) {
      break;
    }
    if (index !== -1) {
      const result = newContent
        .slice(index)
        .match(
          /View this example's <a href="https:\/\/github.com\/maurice\/yay-machine\/blob\/main\/([^"]+)" target="_blank"/,
        );
      if (!result) {
        log(`${fileName}: seems corrupted - no example match`);
      } else {
        const exampleFile = result[1];
        log("found embedded example", exampleFile, index);
        const definition = (
          await readFile(exampleFile, { encoding: "utf8" })
        ).trim();
        const usage = (
          await readFile(exampleFile.replace(".ts", "Usage.ts"), {
            encoding: "utf8",
          })
        ).trim();

        const startDefinition = newContent.indexOf("```typescript", index);
        const endDefinition = newContent.indexOf("```", startDefinition + 3);
        const startUsage = newContent.indexOf(
          "```typescript",
          endDefinition + 3,
        );
        const endUsage = newContent.indexOf("```", startUsage + 3);

        newContent = [
          newContent.slice(0, startDefinition),
          `\`\`\`typescript\n// ${basename(exampleFile)}\n`,
          definition,
          "\n",
          newContent.slice(endDefinition, startUsage),
          "```typescript\n",
          usage,
          "\n",
          newContent.slice(endUsage),
        ].join("");
        lastIndex = endUsage;
      }
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

if (didChange) {
  log("writing metadata", metadataFile, newMetadata);
  if (!dryRun) {
    await writeFile(metadataFile, JSON.stringify(newMetadata, undefined, "  "));
  }
}

// check msw script up-to-date
const {
  dependencies: { msw: mswVersion },
} = JSON.parse(String(await readFile("packages/site/package.json")));
let mswScript = String(
  await readFile("packages/site/public/mockServiceWorker.js"),
);
let [, mswScriptVersion] = /const PACKAGE_VERSION = "(.+)"/.exec(mswScript)!;

if (`^${mswScriptVersion}` !== mswVersion) {
  log(
    `MSW version mismatch: package.json has ${mswVersion}, but mockServiceWorker.js has ${mswScriptVersion}. Attempting to update...`,
  );
  try {
    const process = Bun.spawnSync(["npx", "msw", "init", "."], {
      cwd: "packages/site/public",
      stdio: ["inherit", "inherit", "inherit"],
    });
    if (process.exitCode !== 0) {
      throw new Error(
        `'npx msw init' failed with exit code ${process.exitCode}`,
      );
    }

    mswScript = String(
      await readFile("packages/site/public/mockServiceWorker.js"),
    );
    [, mswScriptVersion] = /const PACKAGE_VERSION = "(.+)"/.exec(mswScript)!;

    if (`^${mswScriptVersion}` !== mswVersion) {
      log(
        `Still mismatched after update: msw="${mswVersion}" script="${mswScriptVersion}". Please update mockServiceWorker.js manually.`,
      );
      process.exit(1);
    } else {
      log(
        `Successfully updated mockServiceWorker.js to version ${mswScriptVersion}.`,
      );
    }
  } catch (error) {
    log("Error updating mockServiceWorker.js:", error.message);
    process.exit(1);
  }
} else {
  log("MSW version is up-to-date.");
}
