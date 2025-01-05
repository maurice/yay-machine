# Development

## Bun

This project uses [bun](https://bun.sh/) for package management and other tasks.

You'll need it on your PATH so install it as per their instructions.

## Initial setup

```sh
bun install         # install dependencies
bun run all         # run all scripts - check, test, build
```

## Other scripts

```sh
bun run check       # type-check, lint
bun test            # run tests once
bun test --watch    # run tests in watch-mode
bun build           # transpile TypeScript to dist/*.js, generate .d.ts files
```

## Contributions

External contributions are welcome but please raise an issue or start a discussion first to ensure the idea aligns with our [philosophy](./articles/why-yay-machine.md#philosophy) and [goals](./articles/why-yay-machine.md#goals).

# Releases

To make a new release, start the manual [**release**](https://github.com/maurice/yay-machine/actions/workflows/release.yml) job in the project's Github Actions.

This job uses [semantic-release](https://github.com/semantic-release/semantic-release) and 

* tags the current version with the next semver according to the last commit message(s)
* adds a GitHub Release with details of all the new changes
* builds the package and publishes it to the public NPM registry,

Credit goes to [this article](https://dev.to/sahanonp/how-to-setup-semantic-release-with-github-actions-31f3) for the steps used to set this up.