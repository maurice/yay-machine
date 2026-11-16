import { afterAll, describe, expect, setDefaultTimeout, test } from "bun:test";
import { createConsumer, removeConsumers } from "../consumerProject";
import {
  cjsSource,
  EXPECTED_STATE,
  esmSource,
  typedSource,
} from "../consumerSources";

setDefaultTimeout(30_000);
afterAll(removeConsumers);

const runtimes = [
  { name: "Node.js", cmd: "node" },
  { name: "Bun", cmd: process.execPath },
] as const;

const entrypoints = [
  { name: "ESM import (.mjs)", file: "index.mjs", source: esmSource },
  { name: "CommonJS require (.cjs)", file: "index.cjs", source: cjsSource },
  {
    name: "TypeScript, type-stripped (.ts)",
    file: "index.ts",
    source: typedSource,
  },
] as const;

describe.concurrent.each(runtimes)("$name", ({ cmd }) => {
  test.each(entrypoints)("$name", async ({ file, source }) => {
    const consumer = await createConsumer({
      "package.json": JSON.stringify({ private: true, type: "module" }),
      [file]: source,
    });

    const result = await consumer.run([cmd, file]);

    expect(result.output).toBe(EXPECTED_STATE);
    expect(result.exitCode).toBe(0);
  });
});
