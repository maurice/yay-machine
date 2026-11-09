export const libraries = ["xstate", "yay-machine"] as const;

export type Library = (typeof libraries)[number];

/**
 * A ready-to-run benchmark subject. `run()` is the timed operation; `observe()`
 * returns a library-neutral snapshot used by the equivalence tests to prove
 * both libraries really did the same work.
 */
export interface Fixture {
  readonly run: () => void;
  readonly observe: () => unknown;
}

export interface ThroughputVariant {
  readonly id: string;
  readonly label: string;
  /** What one timed operation means, eg "2 events" or "1,000 events" */
  readonly op: string;
  /** Throughput unit shown in reports, eg "events/s" */
  readonly unit: string;
  /** How many units are processed per timed operation */
  readonly unitsPerOp: number;
  readonly setup: Readonly<Record<Library, () => Fixture>>;
}

export interface MemoryVariant {
  readonly id: string;
  readonly label: string;
  readonly instances: number;
  /** Creates (and starts) one long-lived instance */
  readonly create: Readonly<Record<Library, () => unknown>>;
  /** Stops an instance previously returned by `create` */
  readonly dispose: Readonly<Record<Library, (instance: never) => void>>;
}

export type SuiteCategory = "micro" | "workload";

interface SuiteBase {
  readonly id: string;
  readonly title: string;
  readonly category: SuiteCategory;
  /** One or two sentences describing what is measured, shown in reports */
  readonly description: string;
}

export interface ThroughputSuite extends SuiteBase {
  readonly kind: "throughput";
  readonly variants: readonly ThroughputVariant[];
}

export interface MemorySuite extends SuiteBase {
  readonly kind: "memory";
  readonly variants: readonly MemoryVariant[];
}

export type Suite = ThroughputSuite | MemorySuite;

export interface Measurement {
  /** units/s for throughput, bytes/instance for memory */
  readonly value: number;
  /** relative margin of error (%) at 95% confidence */
  readonly rme: number;
  readonly samples: number;
}

export interface VariantResult {
  readonly id: string;
  readonly label: string;
  readonly op?: string;
  readonly unit: string;
  readonly higherIsBetter: boolean;
  readonly results: Readonly<Record<Library, Measurement>>;
}

export interface SuiteResult {
  readonly id: string;
  readonly title: string;
  readonly category: SuiteCategory;
  readonly kind: Suite["kind"];
  readonly description: string;
  readonly variants: readonly VariantResult[];
}

export interface BenchReport {
  readonly schemaVersion: 1;
  readonly generatedAt: string;
  readonly quick: boolean;
  readonly environment: {
    readonly runtime: string;
    readonly os: string;
    readonly cpu: string;
    readonly cores: number;
    readonly memoryGb: number;
  };
  readonly packages: Readonly<Record<Library, string>>;
  readonly suites: readonly SuiteResult[];
}
