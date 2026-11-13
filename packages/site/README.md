_📦 This package is the documentation site._

[![a Starlight app](https://astro.badg.es/v2/built-with-starlight/tiny.svg)](https://starlight.astro.build)

It's [a Starlight app](https://starlight.astro.build) that is ultimately builds to static assets, then deployed to GitHub pages, and hosted at https://yay-machine.js.org/.

## Project Structure

Starlight looks for `.md` or `.mdx` files in the `src/content/docs/` directory. Each file is exposed as a route based on its file name. Sidebar config is in `astro.config.mjs`, but page titles/order is generally defined in the page's front matter.

Images can be added to `src/assets/` and embedded in Markdown with a relative link.

Static assets, like favicons, can be placed in the `public/` directory.

We have some global CSS styles (Starlight theme overrides) in `src/styles/custom.css`.

Custom components (increasingly mostly React) are in `src/components`. They are
styled with [StyleX](https://stylexjs.com/) (`stylex.create` and `stylex.props`),
wired into Astro by `stylex.integration.mjs`:

- Use `notContent(...)` instead of `stylex.props(...)` on elements rendered inside
  docs prose, so Starlight's `not-content` class is kept.
- StyleX rejects some shorthands (`border`, `background`, `animation`). Use the
  longhands instead (`borderWidth`/`borderStyle`/`borderColor`, `backgroundColor`,
  and so on). The build fails rather than silently dropping them.
- Starlight colour tokens (`--sl-color-*`) are mapped in
  `src/styles/starlight.stylex.ts`. `defineConsts`, `defineVars` and
  `defineMarker` must be exported from a `*.stylex.ts` file.
- Class names are generated, so Playwright tests select by `data-testid`.
- The Lit `ym-*` elements keep their own `css` templates and Astro components keep
  their scoped `<style>` blocks.
- The site build fails if StyleX's CSS doesn't reach every page, rather than
  shipping unstyled components. It checks via an internal of `@stylexjs/unplugin`,
  so look at `stylex.integration.mjs` first if an upgrade of `@stylexjs/*` breaks
  the build.

## Commands

All commands are run from the root of the project, from a terminal:

| Command                | Action                                           |
| :--------------------- | :----------------------------------------------- |
| `bun install`          | Installs dependencies                            |
| `bun run site:dev`     | Starts local site dev server at `localhost:4321` |
| `bun run site:build`   | Build your production site to `./dist/`          |
| `bun run site:preview` | Preview your build locally, before deploying     |
| `bun run site:test`    | Compare built state diagrams with screenshots    |
| `bun run site:sprites` | Scramble and measure the dog sprite sheets       |

In the `packages/site` directory:

| Command                | Action                                           |
| :--------------------- | :----------------------------------------------- |
| `bun run astro ...`    | Run CLI commands like `astro add`, `astro check` |
| `bun run astro --help` | Get help using the Astro CLI                     |

## Diagram visual tests

The Playwright tests visit every HTML page in the **built static site** and
capture each `ym-chart`, including charts inside shadow DOM. A diagram inventory
also detects removed diagrams. A separate interaction covers the stock ticker's
dynamically created price-machine diagram. Other browser tests exercise stock
connection and subscription cleanup, fullscreen controls, and ATM card
ejection.

From the repository root:

```sh
bunx playwright install --with-deps chromium
bun run build --filter=@yay-machine/site
bun run site:test
```

The suite starts and stops its own Astro preview server on port 4322. It does not
use the dev server or rebuild the site. Playwright tests use `*.spec.ts`; the
root `bunfig.toml` ignores `*.spec.*`, so Bun's unit-test runner (which only
runs `*.test.ts(x)`) does not pick them up.
Playwright runs on Bun (`bunx --bun playwright test`), which Playwright
supports natively since v1.65: it detects Bun and skips its Node-specific
TypeScript ESM loader, letting Bun transpile the config and tests itself.

Screenshots use Chromium on Linux, a fixed viewport, light theme, locale and time
zone. Random demo values and subscription IDs are fixed in the test browser.
Tests wait for hydration, fonts and diagram paths; screenshot assertions
wait for stable rendering and disable animations. The price-machine test pauses
the clock before subscribing so random price ticks cannot change the image.
Imperative Web Animations are finished immediately so Dagre never measures
state bounds distorted by an in-progress wiggle.
Screenshots target the full graph, not the page-width host (which clips wide
diagrams such as the ATM). Screenshot-only CSS expands the chart background and
hides the overlapping table of contents and full-screen button without changing
the renderer.
Use Linux (as in CI) when reviewing or updating the committed baselines:

```sh
bun run site:test -- --update-snapshots
bun run site:test
bunx playwright show-report packages/site/playwright-report
```

Review image changes before committing `visual-tests/__screenshots__/`. Never update
baselines just to silence an unexpected regression. CI uploads the HTML report,
traces, and expected/actual/diff images when tests fail.

The initial baselines were captured from commit
`45582b53a884e6089e82e73c1efafeb0d3b56945` (before the Dagre update), using
`@dagrejs/dagre@3.0.0` and `@dagrejs/graphlib@4.0.1`. They intentionally preserve
the old rendering so the Dagre 3.1.3 self-loop regression can be investigated.
The renderer now restores the prior self-loop geometry. The
`quick-start-diagram-1` and `reference-transitions-diagram-1` screenshots were
updated to accept other Dagre 3.1.3 layout changes; all remaining screenshots
continue to use the original baselines.

## Want to learn more?

Check out [Starlight’s docs](https://starlight.astro.build/), read [the Astro documentation](https://docs.astro.build), or jump into the [Astro Discord server](https://astro.build/chat).
