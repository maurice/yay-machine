import { afterAll, describe, expect, setDefaultTimeout, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createConsumer, removeConsumers } from "../consumerProject";
import { typedSource } from "../consumerSources";

setDefaultTimeout(60_000);
afterAll(removeConsumers);

// Known publishing bugs. Affected cases use `test.failing`, so they start
// failing (and must be unmarked) once the bug is fixed.
const EXTENSIONLESS_DTS_IMPORTS =
  "#641: dist/*.d.ts use extensionless relative imports";
const REQUIRE_GETS_ESM_TYPES =
  "require condition resolves ESM-format dist/index.d.ts";

const tscBin = (packageName: string): string => {
  const packageJsonPath = Bun.resolveSync(
    `${packageName}/package.json`,
    import.meta.dir,
  );
  const { bin } = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
    bin: { tsc: string };
  };
  return join(dirname(packageJsonPath), bin.tsc);
};

const compilers = [
  { name: "TypeScript 7", bin: tscBin("typescript"), legacy: false },
  { name: "TypeScript 5.9", bin: tscBin("typescript-5"), legacy: true },
] as const;

interface ResolutionCase {
  readonly packageType: "module" | "commonjs";
  readonly module: string;
  readonly moduleResolution: string;
  readonly knownIssues?: readonly string[];
  /** Removed in TypeScript 7 */
  readonly legacyOnly?: boolean;
}

const nodeCase = (
  packageType: ResolutionCase["packageType"],
  module: string,
  moduleResolution: string,
  { supportsRequireOfEsm }: { supportsRequireOfEsm: boolean },
): ResolutionCase => ({
  packageType,
  module,
  moduleResolution,
  knownIssues: [
    EXTENSIONLESS_DTS_IMPORTS,
    ...(packageType === "commonjs" && !supportsRequireOfEsm
      ? [REQUIRE_GETS_ESM_TYPES]
      : []),
  ],
});

const cases: readonly ResolutionCase[] = [
  ...(["module", "commonjs"] as const).flatMap((packageType) => [
    nodeCase(packageType, "node16", "node16", { supportsRequireOfEsm: false }),
    nodeCase(packageType, "node18", "nodenext", {
      supportsRequireOfEsm: false,
    }),
    nodeCase(packageType, "node20", "nodenext", { supportsRequireOfEsm: true }),
    nodeCase(packageType, "nodenext", "nodenext", {
      supportsRequireOfEsm: true,
    }),
  ]),
  { packageType: "module", module: "esnext", moduleResolution: "bundler" },
  { packageType: "module", module: "preserve", moduleResolution: "bundler" },
  {
    packageType: "commonjs",
    module: "commonjs",
    moduleResolution: "node10",
    legacyOnly: true,
  },
];

describe.concurrent.each(compilers)("$name", ({ bin, legacy }) => {
  for (const testCase of cases.filter((c) => legacy || !c.legacyOnly)) {
    const { packageType, module, moduleResolution, knownIssues } = testCase;
    const name = `"type": "${packageType}", module: ${module}, moduleResolution: ${moduleResolution}`;
    const register = knownIssues?.length ? test.failing : test;

    register(
      knownIssues?.length ? `${name} [known: ${knownIssues.join("; ")}]` : name,
      async () => {
        const consumer = await createConsumer({
          "package.json": JSON.stringify({ private: true, type: packageType }),
          "tsconfig.json": JSON.stringify({
            compilerOptions: {
              module,
              moduleResolution,
              strict: true,
              noEmit: true,
              skipLibCheck: false,
              types: [],
            },
            files: ["index.ts"],
          }),
          "index.ts": typedSource,
        });

        const result = await consumer.run([bin, "-p", "tsconfig.json"]);

        expect(result.output).toBe("");
        expect(result.exitCode).toBe(0);
      },
    );
  }
});
