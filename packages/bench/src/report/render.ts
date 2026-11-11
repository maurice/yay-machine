import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { CHARTS_DIR, RESULTS_FILE } from "../paths";
import type { BenchReport } from "../types";
import { renderOverview, renderSuite } from "./charts";

// Usage: bun src/report/render.ts
//
// Renders results/latest.json to SVG charts in the site's assets.

const readReport = async (): Promise<BenchReport> => {
  try {
    return JSON.parse(await readFile(RESULTS_FILE, "utf8")) as BenchReport;
  } catch {
    console.error(
      `No benchmark results found at ${RESULTS_FILE}\nRun \`bun run bench\` first.`,
    );
    return process.exit(1);
  }
};

const report = await readReport();
if (report.schemaVersion !== 1) {
  console.error(`Unsupported results schemaVersion: ${report.schemaVersion}`);
  process.exit(1);
}
if (report.quick) {
  console.warn("Warning: rendering charts from a --quick run");
}

await mkdir(CHARTS_DIR, { recursive: true });
for (const file of await readdir(CHARTS_DIR)) {
  if (file.endsWith(".svg")) {
    await rm(join(CHARTS_DIR, file));
  }
}

const charts: [string, string][] = [
  ["overview.svg", renderOverview(report)],
  ...report.suites.map((suite): [string, string] => [
    `${suite.id}.svg`,
    renderSuite(report, suite),
  ]),
];
for (const [file, svg] of charts) {
  const path = join(CHARTS_DIR, file);
  await writeFile(path, svg);
  console.log(`Wrote ${relative(process.cwd(), path)}`);
}
