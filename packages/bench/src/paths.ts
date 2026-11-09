import { join } from "node:path";

export const RESULTS_FILE = join(
  import.meta.dir,
  "..",
  "results",
  "latest.json",
);

export const CHARTS_DIR = join(
  import.meta.dir,
  "..",
  "..",
  "site",
  "src",
  "assets",
  "bench",
);
