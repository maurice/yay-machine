import { join } from "node:path";
import benny from "benny";
import {
  type Library,
  type Measurement,
  type MemorySuite,
  type Suite,
  type SuiteResult,
  type ThroughputSuite,
  type VariantResult,
  libraries,
} from "./types";

export interface RunOptions {
  readonly quick: boolean;
}

const caseOptions = ({ quick }: RunOptions) =>
  quick
    ? { minTime: 0.05, maxTime: 0.5, minSamples: 5 }
    : { maxTime: 5, minSamples: 20 };

/** Alternate which library runs first, so neither always benefits/suffers */
const orderFor = (index: number): readonly Library[] =>
  index % 2 === 0 ? libraries : libraries.toReversed();

const runThroughput = async (
  suite: ThroughputSuite,
  options: RunOptions,
): Promise<SuiteResult> => {
  const variants: VariantResult[] = [];
  for (const [index, variant] of suite.variants.entries()) {
    const order = orderFor(index);
    const fixtures = Object.fromEntries(
      order.map((library) => [library, variant.setup[library]()]),
    ) as unknown as Record<Library, { run: () => void }>;
    const summary = await benny.suite(
      `${suite.title}: ${variant.label} (1 op = ${variant.op})`,
      ...order.map((library) =>
        benny.add(
          library,
          () => {
            fixtures[library].run();
          },
          caseOptions(options),
        ),
      ),
      benny.cycle(),
    );
    const results = Object.fromEntries(
      summary.results.map((result): [string, Measurement] => [
        result.name,
        {
          value: variant.unitsPerOp / result.details.mean,
          rme: result.details.relativeMarginOfError,
          samples: result.samples,
        },
      ]),
    ) as Record<Library, Measurement>;
    variants.push({
      id: variant.id,
      label: variant.label,
      op: variant.op,
      unit: variant.unit,
      higherIsBetter: true,
      results,
    });
  }
  return toSuiteResult(suite, variants);
};

const summarise = (samples: readonly number[]): Measurement => {
  const sorted = samples.toSorted((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
  const mean = samples.reduce((sum, x) => sum + x, 0) / samples.length;
  const variance =
    samples.reduce((sum, x) => sum + (x - mean) ** 2, 0) /
    Math.max(1, samples.length - 1);
  const sem = Math.sqrt(variance / samples.length);
  return {
    value: median,
    rme: mean ? ((1.96 * sem) / mean) * 100 : 0,
    samples: samples.length,
  };
};

const memorySample = (suite: Suite, variantId: string, library: Library) => {
  const sample = Bun.spawnSync([
    process.execPath,
    join(import.meta.dir, "memorySample.ts"),
    suite.id,
    variantId,
    library,
  ]);
  if (!sample.success) {
    throw new Error(`Memory sample failed: ${sample.stderr.toString()}`);
  }
  return Number(JSON.parse(sample.stdout.toString()));
};

const runMemory = (suite: MemorySuite, options: RunOptions): SuiteResult => {
  const repeats = options.quick ? 2 : 5;
  const variants: VariantResult[] = [];
  for (const [index, variant] of suite.variants.entries()) {
    const order = orderFor(index);
    const samples: Record<Library, number[]> = {
      xstate: [],
      "yay-machine": [],
    };
    for (let r = 0; r < repeats; r++) {
      for (const library of order) {
        samples[library].push(memorySample(suite, variant.id, library));
      }
    }
    const results = {
      xstate: summarise(samples.xstate),
      "yay-machine": summarise(samples["yay-machine"]),
    };
    console.log(`${suite.title}: ${variant.label}`);
    for (const library of order) {
      console.log(
        `  ${library}: ${Math.round(results[library].value).toLocaleString("en-US")} bytes/instance ±${results[library].rme.toFixed(2)}%`,
      );
    }
    variants.push({
      id: variant.id,
      label: variant.label,
      unit: "bytes/instance",
      higherIsBetter: false,
      results,
    });
  }
  return toSuiteResult(suite, variants);
};

const toSuiteResult = (
  suite: Suite,
  variants: readonly VariantResult[],
): SuiteResult => ({
  id: suite.id,
  title: suite.title,
  category: suite.category,
  kind: suite.kind,
  description: suite.description,
  variants,
});

export const runSuite = async (
  suite: Suite,
  options: RunOptions,
): Promise<SuiteResult> =>
  suite.kind === "throughput"
    ? runThroughput(suite, options)
    : runMemory(suite, options);
