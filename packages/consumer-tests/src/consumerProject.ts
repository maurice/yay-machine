import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const libraryDir = join(repoRoot, "packages/yay-machine");

export interface CommandResult {
  readonly exitCode: number;
  readonly output: string;
}

export const run = async (
  cmd: readonly string[],
  cwd: string,
): Promise<CommandResult> => {
  const proc = Bun.spawn([...cmd], { cwd, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { exitCode, output: `${stdout}${stderr}`.trim() };
};

let tarball: Promise<string> | undefined;

/**
 * Packs yay-machine with `npm pack`, exactly as `@semantic-release/npm`
 * would publish it. Packed once per test run.
 */
export const packLibrary = (): Promise<string> =>
  (tarball ??= (async () => {
    if (!existsSync(join(libraryDir, "dist/index.d.ts"))) {
      throw new Error(
        "packages/yay-machine/dist is missing; run `bun run build` first",
      );
    }
    const destination = await mkdtemp(join(tmpdir(), "yay-machine-pack-"));
    const { exitCode, output } = await run(
      ["npm", "pack", "--json", "--pack-destination", destination],
      libraryDir,
    );
    if (exitCode !== 0) {
      throw new Error(`npm pack failed:\n${output}`);
    }
    const [{ filename }] = JSON.parse(output) as [{ filename: string }];
    return join(destination, filename);
  })());

export interface ConsumerProject {
  readonly dir: string;
  run(cmd: readonly string[]): Promise<CommandResult>;
}

const consumerDirs: string[] = [];

/**
 * Creates an isolated project in the OS temp dir (so nothing resolves through
 * the monorepo's node_modules) with the packed tarball installed as
 * `node_modules/yay-machine`, the same layout `npm install` produces for a
 * zero-dependency package.
 */
export const createConsumer = async (
  files: Readonly<Record<string, string>>,
): Promise<ConsumerProject> => {
  const dir = await mkdtemp(join(tmpdir(), "yay-machine-consumer-"));
  consumerDirs.push(dir);
  const installDir = join(dir, "node_modules/yay-machine");
  await mkdir(installDir, { recursive: true });
  const untar = await run(
    [
      "tar",
      "-xzf",
      await packLibrary(),
      "-C",
      installDir,
      "--strip-components=1",
    ],
    dir,
  );
  if (untar.exitCode !== 0) {
    throw new Error(`tar failed:\n${untar.output}`);
  }
  for (const [path, contents] of Object.entries(files)) {
    await mkdir(dirname(join(dir, path)), { recursive: true });
    await writeFile(join(dir, path), contents);
  }
  return { dir, run: (cmd) => run(cmd, dir) };
};

export const removeConsumers = async (): Promise<void> => {
  await Promise.all(
    consumerDirs
      .splice(0)
      .map((dir) => rm(dir, { recursive: true, force: true })),
  );
};
