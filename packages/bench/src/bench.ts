import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import { join } from "node:path";
import { runSuite } from "./harness";
import { RESULTS_FILE } from "./paths";
import { suites } from "./suites";
import type { BenchReport, SuiteResult } from "./types";

// Usage: bun src/bench.ts [suite-id...] [--quick] [--save | --no-save]
//
// Each suite runs in its own child process so JIT state from one suite can't
// influence another. A full (non-quick) run of all suites is saved to
// results/latest.json, which is what the published charts are rendered from.

const args = process.argv.slice(2);
const flags = new Set(args.filter((arg) => arg.startsWith("--")));
const positional = args.filter((arg) => !arg.startsWith("--"));
const quick = flags.has("--quick");

const fail = (message: string): never => {
  console.error(message);
  process.exit(1);
};

const findSuite = (id: string) =>
  suites.find((suite) => suite.id === id) ??
  fail(
    `Unknown suite: "${id}". Available: ${suites.map((s) => s.id).join(", ")}`,
  );

const runChild = async (id: string, out: string) => {
  const child = Bun.spawn(
    [
      process.execPath,
      import.meta.path,
      "--child",
      id,
      out,
      ...(quick ? ["--quick"] : []),
    ],
    { stdio: ["inherit", "inherit", "inherit"] },
  );
  if ((await child.exited) !== 0) {
    fail(`Suite "${id}" failed`);
  }
  return JSON.parse(await readFile(out, "utf8")) as SuiteResult;
};

const packageVersion = async (name: string) => {
  const file = Bun.resolveSync(`${name}/package.json`, import.meta.dir);
  return ((await Bun.file(file).json()) as { version: string }).version;
};

const yayMachineVersion = () => {
  const describe = Bun.spawnSync([
    "git",
    "describe",
    "--tags",
    "--always",
    "--dirty",
  ]);
  return describe.success ? describe.stdout.toString().trim() : "unknown";
};

const environment = (): BenchReport["environment"] => ({
  runtime: `Bun ${Bun.version}`,
  os: `${os.type()} ${os.release()} (${os.arch()})`,
  cpu: os.cpus()[0]?.model.trim() ?? "unknown",
  cores: os.cpus().length,
  memoryGb: Math.round(os.totalmem() / 1024 ** 3),
});

const formatRatio = (result: SuiteResult["variants"][number]) => {
  const { xstate, "yay-machine": yay } = result.results;
  const ratio = result.higherIsBetter
    ? yay.value / xstate.value
    : xstate.value / yay.value;
  return `${ratio.toFixed(ratio < 10 ? 2 : 1)}x`;
};

const printSummary = (results: readonly SuiteResult[]) => {
  console.log("\nSummary (yay-machine relative to xstate, >1x is better)\n");
  console.table(
    results.flatMap((suite) =>
      suite.variants.map((variant) => ({
        suite: suite.title,
        variant: variant.label,
        unit: variant.unit,
        xstate: Math.round(variant.results.xstate.value),
        "yay-machine": Math.round(variant.results["yay-machine"].value),
        "yay-machine vs xstate": formatRatio(variant),
      })),
    ),
  );
};

const main = async () => {
  if (flags.has("--child")) {
    const [id, out] = positional;
    const result = await runSuite(findSuite(id ?? ""), { quick });
    await writeFile(out ?? fail("missing output file"), JSON.stringify(result));
    return;
  }

  const selected = positional.length ? positional.map(findSuite) : suites;
  const save =
    flags.has("--save") ||
    (!flags.has("--no-save") && !quick && selected.length === suites.length);

  const tmp = await mkdtemp(join(os.tmpdir(), "yay-bench-"));
  const results: SuiteResult[] = [];
  try {
    for (const suite of selected) {
      const rule = "=".repeat(70);
      console.log(`\n${rule}\n  ${suite.title} [${suite.id}]\n${rule}`);
      results.push(await runChild(suite.id, join(tmp, `${suite.id}.json`)));
    }
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }

  printSummary(results);

  if (!save) {
    console.log(
      "\nResults not saved (only full, non-quick runs are saved by default; use --save to force).",
    );
    return;
  }

  const report: BenchReport = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    quick,
    environment: environment(),
    packages: {
      xstate: await packageVersion("xstate"),
      "yay-machine": yayMachineVersion(),
    },
    suites: results,
  };
  await writeFile(RESULTS_FILE, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`\nSaved ${RESULTS_FILE}`);
  console.log("Run `bun run bench:charts` to regenerate the SVG charts.");
};

await main();
