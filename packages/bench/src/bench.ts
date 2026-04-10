import { always } from "./suites/always";
import { complex } from "./suites/complex";
import { counter } from "./suites/counter";
import { defaultHandling } from "./suites/defaultHandling";
import { effects } from "./suites/effects";
import { guards } from "./suites/guards";
import { lifecycle } from "./suites/lifecycle";
import { multiInstance } from "./suites/multiInstance";
import { toggle } from "./suites/toggle";

const suites: Record<string, () => Promise<unknown>> = {
  toggle,
  counter,
  guards,
  always,
  defaultHandling,
  effects,
  lifecycle,
  multiInstance,
  complex,
};

const requested = process.argv[2];

async function run() {
  if (requested) {
    const suite = suites[requested];
    if (!suite) {
      console.error(
        `Unknown suite: "${requested}". Available: ${Object.keys(suites).join(", ")}`,
      );
      process.exit(1);
    }
    await suite();
  } else {
    for (const [name, suite] of Object.entries(suites)) {
      console.log(`\n${"=".repeat(60)}`);
      console.log(`  ${name}`);
      console.log(`${"=".repeat(60)}\n`);
      await suite();
    }
  }
}

run();
