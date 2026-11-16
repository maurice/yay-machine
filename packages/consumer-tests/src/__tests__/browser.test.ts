import {
  afterAll,
  beforeAll,
  describe,
  expect,
  setDefaultTimeout,
  test,
} from "bun:test";
import { join, normalize } from "node:path";
import { type Browser, chromium } from "playwright";
import { build as viteBuild } from "vite";
import { createConsumer, removeConsumers } from "../consumerProject";
import { browserSource, EXPECTED_STATE } from "../consumerSources";

setDefaultTimeout(60_000);

let browser: Browser;
beforeAll(async () => {
  browser = await chromium.launch();
});
afterAll(async () => {
  await browser?.close();
  await removeConsumers();
});

const html = (head: string) => `<!doctype html>
<html>
  <head>
    ${head}
    <script type="module" src="./main.js"></script>
  </head>
  <body></body>
</html>
`;

const serve = (root: string) =>
  Bun.serve({
    port: 0,
    hostname: "127.0.0.1",
    fetch: async (request) => {
      const { pathname } = new URL(request.url);
      const file = Bun.file(
        join(root, normalize(pathname === "/" ? "/index.html" : pathname)),
      );
      return (await file.exists())
        ? new Response(file)
        : new Response("Not found", { status: 404 });
    },
  });

/** Loads the page and returns the machine state it rendered. */
const stateRenderedBy = async (root: string): Promise<string | undefined> => {
  using server = serve(root);
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });
  try {
    await page.goto(server.url.href);
    // Report page errors in preference to a bare "attribute missing" failure.
    await page
      .locator("body[data-state]")
      .waitFor({ state: "attached", timeout: 5000 })
      .catch(() => undefined);
    expect(errors).toEqual([]);
    return (await page.locator("body").getAttribute("data-state")) ?? undefined;
  } finally {
    await page.close();
  }
};

const browserConsumer = () =>
  createConsumer({
    "package.json": JSON.stringify({ private: true, type: "module" }),
    "main.js": browserSource,
    "index.html": html(""),
  });

describe("Chromium", () => {
  test("native ES modules with an import map (no bundler)", async () => {
    const consumer = await createConsumer({
      "main.js": browserSource,
      "index.html": html(
        `<script type="importmap">${JSON.stringify({
          imports: {
            "yay-machine": "./node_modules/yay-machine/dist/index.js",
          },
        })}</script>`,
      ),
    });

    expect(await stateRenderedBy(consumer.dir)).toBe(EXPECTED_STATE);
  });

  test("bundled with Bun", async () => {
    const consumer = await browserConsumer();
    const outdir = join(consumer.dir, "dist");

    const result = await Bun.build({
      entrypoints: [join(consumer.dir, "index.html")],
      outdir,
      target: "browser",
      minify: true,
    });

    expect(result.logs).toEqual([]);
    expect(result.success).toBe(true);
    expect(await stateRenderedBy(outdir)).toBe(EXPECTED_STATE);
  });

  test("bundled with Vite", async () => {
    const consumer = await browserConsumer();

    await viteBuild({
      root: consumer.dir,
      configFile: false,
      logLevel: "silent",
      base: "./",
    });

    expect(await stateRenderedBy(join(consumer.dir, "dist"))).toBe(
      EXPECTED_STATE,
    );
  });
});
