import { heapStats } from "bun:jsc";
import { suites } from "./suites";
import { type Library, libraries } from "./types";

// Measures retained heap per instance for one memory variant + library.
// Runs in a fresh process per sample: re-using a heap that has already
// allocated and freed instances makes before/after deltas unreliable.
// Usage: bun src/memorySample.ts <suite-id> <variant-id> <library>

const [suiteId, variantId, library] = process.argv.slice(2);
const suite = suites.find((s) => s.id === suiteId);
const variant =
  suite?.kind === "memory"
    ? suite.variants.find((v) => v.id === variantId)
    : undefined;
if (!variant || !libraries.includes(library as Library)) {
  console.error(`Unknown memory variant: ${suiteId}/${variantId}/${library}`);
  process.exit(1);
}

const create = variant.create[library as Library];
const heapSize = () => {
  Bun.gc(true);
  Bun.gc(true);
  return heapStats().heapSize;
};

// warm up so lazily-initialised library internals aren't attributed to the
// measured instances
variant.dispose[library as Library](create() as never);

const instances: unknown[] = Array.from({ length: variant.instances });
const before = heapSize();
for (let i = 0; i < variant.instances; i++) {
  instances[i] = create();
}
const after = heapSize();
console.log(JSON.stringify((after - before) / instances.length));
