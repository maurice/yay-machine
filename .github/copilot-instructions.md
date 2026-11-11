# Copilot Instructions for yay-machine

## Build, Test, and Lint

```sh
bun install                 # install dependencies from bun.lock
bun run all                 # fix, check, test, build (full validation)
bun run check               # type-check + lint + format check
bun run check:types         # bun check (turbo, all packages)
bun run check:lint          # oxlint (type-aware)
bun run check:format        # oxfmt
bun run fix                 # auto-fix lint + format
bun run test                # bun test (all packages)
bun run test:watch          # bun test --watch
bun run build               # turbo build (sequential, all packages)
```

### Running a single test

```sh
bun test path/to/file.test.ts                       # single file
bun test --test-name-pattern "pattern" path/to/dir  # by test name regex
```

### Site (docs)

```sh
bun run site:dev            # Astro Starlight dev server
bun run site:build          # static build
```

## Architecture

This is a **zero-dependency TypeScript state-machine library** organized as a Bun workspaces monorepo with Turbo orchestration.

### Packages

- **`packages/yay-machine`** — Core library. Exports `defineMachine`, `createMachine`, type utilities (`ExtractState`, `ExtractEvent`, `StateData`, `EventPayload`), and base interfaces (`MachineState`, `MachineEvent`). Builds to dual ESM + CJS with Bun's bundler. Has no runtime dependencies.
- **`packages/example-machines`** — 18+ reference state-machine implementations (toggle, counter, login, elevator, ATM, STOMP parser, etc.). Each example lives in its own directory with a machine definition, usage file, and tests.
- **`packages/site`** — Documentation site ([yay-machine.js.org](https://yay-machine.js.org/)) built with Astro Starlight + MDX. Interactive demos use React. Deployed to GitHub Pages on push to `main`.
- **`packages/bench`** — Performance benchmarks comparing yay-machine vs xstate using Benny.

Within the monorepo, TypeScript resolves `yay-machine` imports to `packages/yay-machine/src` through the `@yay-machine/source` export condition (enabled via `customConditions` in the root and site tsconfigs), so type-checking and type-aware lint don't need the library to be built. Runtimes (Bun, Vite) ignore that condition and still load `dist`, so on a clean checkout run `bun run build` before tests or the site; the site's type-check also needs the Astro types that the build generates.

### Key source files (core library)

- `defineMachine.ts` — Factory function implementing the state-machine runtime (transition resolution, guards, effects, subscriptions).
- `MachineDefinitionConfig.ts` — The main configuration type that users pass to `defineMachine`. Defines states, transitions, guards, effects, and lifecycle hooks.
- `MachineInstance.ts` — The running machine interface (`state`, `start()`, `stop()`, `send()`, `subscribe()`).
- `createMachine.ts` — Convenience wrapper that calls `defineMachine(...).newInstance().start()`.

## Conventions

### TypeScript patterns

- All state and event properties are **`readonly`**. Immutability is enforced at the type level.
- States use `readonly name: string` as discriminator; events use `readonly type: string`. These follow structural typing — users define plain interfaces matching the shape rather than extending base types.
- State and event types are **discriminated unions**:
  ```typescript
  type MyState =
    | { readonly name: "idle" }
    | { readonly name: "active"; readonly count: number };
  ```
- Data transformations use spread: `{ ...state, count: state.count + 1 }`.
- Generic parameter order is always `<StateType, EventType>`.
- The project uses `erasableSyntaxOnly` in tsconfig — no enums, decorators, or constructor parameter properties.
- Type checking uses Bun's built-in `bun check` (TypeScript 7 semantics). Keep `tsc` for `.d.ts` generation; Bun's checker does not emit declarations.

### Testing

- **Test runner**: Bun test (`import { expect, test, mock } from "bun:test"`).
- **File naming**: `*.test.ts` in `__tests__/` subdirectories co-located with source.
- **Playwright**: visual tests use `*.spec.ts` (in `packages/site/visual-tests/`), which `bunfig.toml` excludes from `bun test`. Run them with `bun run site:test`.
- **Pattern**: Define machine → `newInstance()` → `start()` → `send()` events → assert `machine.state`.
- Test files allow `no-non-null-assertion`, `no-explicit-any` and `unbound-method` via oxlint overrides.

### Linting and formatting

- **Linter**: oxlint (Rust-based) with typescript, react, and unicorn plugins. Config: `.oxlintrc.json`.
- **Type-aware lint**: `.oxlintrc.json` sets `options.typeAware` (via the `oxlint-tsgolint` devDependency), so rules that need type information run in the normal lint pass. `typescript/no-deprecated` flags any use of a `@deprecated` symbol, so use the replacement named in the diagnostic (e.g. `WarningCircleIcon` instead of the deprecated `WarningCircle`). `no-unsafe-type-assertion` and `no-unnecessary-type-parameters` are off because the library deliberately uses casts and generic internals, and `restrict-template-expressions` allows `never` for exhaustive `default` branches.
- Suppress a justified finding with `// oxlint-disable-next-line <rule> -- <reason>`. Avoid this in example machines, which are embedded verbatim in the docs via `?raw` imports; prefer a small code change (e.g. `void` on a deliberately unawaited promise).
- **Formatter**: oxfmt (Rust-based). 80 char print width, import sorting enabled (no newlines between groups). Config: `.oxfmtrc.json`.
- `no-param-reassign` is enforced. Unused vars prefixed with `_` are allowed.

### Commits

- **Conventional commits** enforced by commitlint + husky. Format: `type(scope): subject`.
- Releases are automated via semantic-release triggered manually from GitHub Actions.

### Code organization

- One concept per file. Each example machine directory has `index.ts` re-exporting its public API.
- `scripts/sync-docs.ts` syncs API documentation and bundlephobia data to the site package.
