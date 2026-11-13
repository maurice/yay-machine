/**
 * Kennels and measures every dog sheet in the site's catalog ahead of time, so
 * pages load one scrambled file and some numbers, rather than reading pixels
 * back from images and searching for poses. Run it with `bun run site:sprites`
 * after adding or replacing a sheet.
 *
 * Sheets come from PNGs copied into packages/sprite-prep/sheets, or else from
 * the site's kennel, so you only need the PNGs you're adding or replacing.
 */
import { fileURLToPath } from "node:url";
import { dogs } from "@yay-machine/site/sprites/dogCatalog";
import {
  dogSheetReader,
  kennelFile,
  measurementsFile,
  readKennelFile,
  readLooseSheets,
  sheetsDir,
} from "./dogSheetFiles";
import { measureDogs } from "./measureDogs";
import { writeKennel } from "./writeKennel";

const repo = fileURLToPath(new URL("../../../", import.meta.url));
const sheetsPath = sheetsDir.slice(repo.length);

const log = (message: string) => {
  process.stdout.write(`${message}\n`);
};

const files = dogs.flatMap((dog) =>
  Object.values(dog.sheets).flatMap((sheet) => (sheet ? [sheet.file] : [])),
);
const kennelled = await readKennelFile();
const loose = await readLooseSheets();

const sheets = new Map(
  files.flatMap((file) => {
    const bytes = loose.get(file) ?? kennelled.get(file);
    return bytes ? [[file, bytes] as const] : [];
  }),
);
const missing = files.filter((file) => !sheets.has(file));
if (missing.length > 0) {
  throw new Error(`Copy these into ${sheetsPath}: ${missing.join(", ")}`);
}
for (const file of loose.keys()) {
  if (!sheets.has(file)) log(`Left out ${file}, which isn't in the catalog`);
}
for (const file of kennelled.keys()) {
  if (!sheets.has(file)) log(`Let ${file} go, as it's not in the catalog`);
}

await Bun.write(kennelFile, writeKennel(sheets));
const fromLoose = files.filter((file) => loose.has(file)).length;
log(
  `Kennelled ${files.length} sheets: ${fromLoose} from ${sheetsPath}, ` +
    `${files.length - fromLoose} already in the kennel`,
);

const measured = await measureDogs(dogs, dogSheetReader(sheets));
await Bun.write(measurementsFile, JSON.stringify(measured));

// oxfmt lays the JSON out readably, e.g. one line per frame
const formatted = Bun.spawnSync(
  ["bunx", "oxfmt", "--write", measurementsFile],
  { cwd: repo, stdout: "ignore", stderr: "inherit" },
);
if (!formatted.success) {
  throw new Error(`Couldn't format ${measurementsFile}`);
}

for (const [id, dogSheets] of Object.entries(measured)) {
  const matches = Object.entries(dogSheets).flatMap(([animation, sheet]) =>
    sheet?.linedUp
      ? [`${animation} ${Math.round((1 - sheet.linedUp.mismatch) * 100)}%`]
      : [],
  );
  log(`${id}: lined up ${matches.join(", ")}`);
}
log(`Wrote ${kennelFile.slice(repo.length)}`);
log(`Wrote ${measurementsFile.slice(repo.length)}`);
