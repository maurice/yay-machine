import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import stylex from "@stylexjs/unplugin";

// Astro hoists the CSS shared by every page (Starlight's) into `common.*.css`
const isSharedCss = (fileName) => /(^|\/)common\.[\w-]+\.css$/.test(fileName);

// StyleX collects its CSS across the app and, at the end of each Vite build,
// appends it to one CSS asset of its choosing. Astro runs two builds, so:
// - SSR build: many per-page CSS assets, so pin the shared `common.*.css`
// - client build: only Expressive Code's `ec.*.css` exists, which the plugin
//   would pick as a fallback, rename, and drop from the output (the pages still
//   link the old name), so skip injection in any build without `common.*.css`
const createStylexPlugin = () => {
  const {
    generateBundle,
    writeBundle: _writeBundle,
    ...plugin
  } = stylex.vite({
    useCSSLayers: true,
    // The compiler silently drops unsupported shorthands (border, background...)
    propertyValidationMode: "throw",
    cssInjectionTarget: isSharedCss,
  });
  return {
    ...plugin,
    generateBundle(options, bundle) {
      if (Object.keys(bundle).some(isSharedCss)) {
        return generateBundle.call(this, options, bundle);
      }
      return undefined;
    },
  };
};

const stylesheetLinks = (html) => {
  const hrefs = [];
  for (const [tag] of html.matchAll(/<link\b[^>]*>/g)) {
    const href = /\bhref=["']([^"']*)["']/.exec(tag)?.[1];
    if (href?.startsWith("/") && /\brel=["']stylesheet["']/.test(tag)) {
      hrefs.push(href.split(/[?#]/)[0]);
    }
  }
  return hrefs;
};

// The plugin never says where, or whether, it put its CSS, and a miss just
// leaves components unstyled. So check the finished site instead: every
// stylesheet the pages link must exist, and every page must link one that
// contains all of the CSS StyleX collected.
const verifyStylesheets = async (dir, stylexCss, logger) => {
  const root = fileURLToPath(dir);
  const pages = (await readdir(root, { recursive: true })).filter((file) =>
    file.endsWith(".html"),
  );
  const sheets = new Map();
  const missing = new Set();
  const unstyled = [];

  for (const page of pages) {
    const html = await readFile(join(root, page), "utf8");
    let hasStylexCss = !stylexCss;
    for (const href of stylesheetLinks(html)) {
      if (!sheets.has(href)) {
        sheets.set(
          href,
          await readFile(join(root, href), "utf8").catch(() => undefined),
        );
      }
      const sheet = sheets.get(href);
      if (sheet === undefined) {
        missing.add(href);
      } else if (stylexCss && sheet.includes(stylexCss)) {
        hasStylexCss = true;
      }
    }
    if (!hasStylexCss) {
      unstyled.push(page);
    }
  }

  const problems = [...missing].map(
    (href) => `${href} is linked by the pages but wasn't built`,
  );
  if (unstyled.length > 0) {
    problems.push(
      `${unstyled.length} of ${pages.length} pages don't link a stylesheet with all of StyleX's CSS (${unstyled.slice(0, 3).join(", ")})`,
    );
  }
  if (sheets.size === 0) {
    problems.push(`found no stylesheet links in ${pages.length} pages`);
  }
  if (problems.length > 0) {
    throw new Error(`StyleX CSS wasn't delivered:\n- ${problems.join("\n- ")}`);
  }
  logger.info(
    `${pages.length} pages checked, ${sheets.size} stylesheets linked, ${stylexCss.length} bytes of StyleX CSS delivered`,
  );
};

export const stylexIntegration = () => {
  let collectCss;
  return {
    name: "stylex",
    hooks: {
      "astro:config:setup": ({ command, injectScript, updateConfig }) => {
        const plugin = createStylexPlugin();
        // Internal to the plugin, but the only way to know what it should
        // have delivered, so fail loudly if an upgrade removes it
        // oxlint-disable-next-line no-underscore-dangle -- the plugin's own name
        collectCss = plugin.__stylexCollectCss;
        if (typeof collectCss !== "function") {
          throw new TypeError(
            "@stylexjs/unplugin no longer exposes __stylexCollectCss, so stylex.integration.mjs can't check its CSS was delivered",
          );
        }
        updateConfig({ vite: { plugins: [plugin] } });
        // Astro never runs Vite's `transformIndexHtml`, so StyleX's dev-server
        // CSS runtime has to be injected into every page by hand
        if (command === "dev") {
          injectScript("page", 'import "virtual:stylex:runtime";');
        }
      },
      "astro:build:done": ({ dir, logger }) =>
        verifyStylesheets(dir, collectCss(), logger),
    },
  };
};
