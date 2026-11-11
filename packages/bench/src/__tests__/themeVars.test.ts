import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { themeVars } from "../report/charts";

const customCss = join(import.meta.dir, "../../../site/src/styles/custom.css");

const declaredVars = (css: string, selector: string) => {
  const blocks = css.split(`${selector} {`).slice(1);
  return Object.fromEntries(
    blocks.flatMap((block) =>
      [
        ...block
          .slice(0, block.indexOf("}"))
          .matchAll(/(--bench-[\w-]+):\s*([^;]+);/g),
      ].map(([, name, value]) => [name, value.trim()]),
    ),
  );
};

test.each([
  ["dark", ":root"],
  ["light", ':root[data-theme="light"]'],
] as const)(
  "site custom.css declares the %s chart colors",
  async (theme, selector) => {
    const css = await readFile(customCss, "utf8");
    expect(declaredVars(css, selector)).toEqual(
      Object.fromEntries(themeVars(theme)),
    );
  },
);
