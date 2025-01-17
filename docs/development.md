# Development

## Bun

This project uses [bun](https://bun.sh/) for package management and other tasks.

You'll need it on your PATH so install it as per their instructions.

## Initial setup

```sh
bun install                 # install dependencies
bun run all                 # run all scripts - check, test, build
```

## Other scripts

```sh
bun run check               # type-check, lint
bun test                    # run tests once
bun test --watch            # run tests in watch-mode
bun build                   # transpile TypeScript to dist/*.js, generate .d.ts files
```

## Contributions

External contributions are welcome but please raise an issue or start a discussion first to ensure the idea aligns with our [philosophy](./articles/why-yay-machine.md#philosophy) and [goals](./articles/why-yay-machine.md#goals).

## Releases

To make a new release, start the manual [**release**](https://github.com/maurice/yay-machine/actions/workflows/release.yml) job in the project's Github Actions.

This job uses [semantic-release](https://github.com/semantic-release/semantic-release) and 

* tags the current version with the next semver according to the last commit message(s)
* adds a GitHub Release with details of all the new changes
* builds the package and publishes it to the public NPM registry,

Credit goes to [this article](https://dev.to/sahanonp/how-to-setup-semantic-release-with-github-actions-31f3) for the steps used to set this up.

## Documentation site (pages)

The documentation site [yay-machine.js.org/](https://yay-machine.js.org/) is deployed to GitHub pages on every push to `main`.

To build the pages site locally

```sh
bun run pages               # generate documentation site (pages)
bun run pages -- --watch    # generate documentation site (pages) in watch mode
```

This runs a custom script to transform the markdown docs (in this [docs folder](./)) into HTML using [marked](https://marked.js.org/) amongst other things. We also copy a bunch of static assets from other directories.

Use VS Code Live 

Using watch-mode together with the [VS Code Live Server extension](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) is essentially all you need to get on-the-fly reloading whenever making local changes.

## Coveralls

Coverage is published to COVERALLS

* [Dashboard](https://coveralls.io/github/maurice/yay-machine)

## Renovate

This project is onboarded with Renovate for automatic dependency update PRs.

* [Dashboard](https://developer.mend.io/github/maurice/yay-machine)

## Logo

The logo is a screenshot of the [Google Fonts Nabla font](https://fonts.google.com/specimen/Nabla?preview.text=yay-machine%20&categoryFilters=Feeling:%2FExpressive%2FFuturistic).

