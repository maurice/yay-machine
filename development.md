# Development

## Bun

This project uses Bun for package management, scripts, tests, and builds.

Install [Bun](https://bun.com/docs/installation) and use the version pinned in
`.bun-version` (also recorded in `package.json#packageManager`). Commit `bun.lock`
when changing dependencies. CI uses `bun install --frozen-lockfile`.

Node/npm are only required by the semantic-release publishing workflow, not for
local development.

## Initial setup

```sh
bun install                 # install dependencies
bun run all                 # fix, check, test, build
```

## Other scripts

```sh
bun run check               # type-check, lint, format check
bun run test                # run tests once
bun run test:watch           # run tests in watch-mode
bun run build               # bundle to dist/*.js, generate .d.ts files
```

`bun run check:types` runs Bun's built-in `bun check` in each workspace via
Turbo. It uses TypeScript 7 semantics; the `typescript` dependency is retained for
`tsc` declaration generation (`build:types`) and editor support. `bun run check`
remains the combined type, lint, and format check.

## Contributions

External contributions are welcome but please raise an issue or start a discussion first to ensure the idea aligns with our [philosophy](https://yay-machine.js.org/articles/why-yay-machine/#philosophy) and [goals](https://yay-machine.js.org/articles/why-yay-machine/#goals).

## Releases

To make a new release, start the manual [**release**](https://github.com/maurice/yay-machine/actions/workflows/release.yml) job in the project's Github Actions.

This job uses [semantic-release](https://github.com/semantic-release/semantic-release) and

- tags the current version with the next semver according to the last commit message(s)
- adds a GitHub Release with details of all the new changes
- builds the package and publishes it to the public NPM registry,

Credit goes to [this article](https://dev.to/sahanonp/how-to-setup-semantic-release-with-github-actions-31f3) for the steps used to set this up.

## Documentation site (pages)

The documentation site [yay-machine.js.org/](https://yay-machine.js.org/) is deployed to GitHub pages on every push to `main`.

To build the pages site locally

```sh
bun run site:dev            # site dev server (watch mode)
bun run site:build          # static build for deployment
```

It's an [Astro Starlight](https://starlight.astro.build/) project using MDX for dynamic content.

Use VS Code Live

Using watch-mode together with the [VS Code Live Server extension](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) is essentially all you need to get on-the-fly reloading whenever making local changes.

## Coveralls

Coverage is published to COVERALLS

- [Dashboard](https://coveralls.io/github/maurice/yay-machine)

## Renovate

This project is onboarded with Renovate for automatic dependency update PRs.

- [Dashboard](https://developer.mend.io/github/maurice/yay-machine)

## Logo

The logo is a screenshot of the [Google Fonts Nabla font](https://fonts.google.com/specimen/Nabla?preview.text=yay-machine%20&categoryFilters=Feeling:%2FExpressive%2FFuturistic).
