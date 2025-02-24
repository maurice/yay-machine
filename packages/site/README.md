_📦 This package is the documentation site._

[![a Starlight app](https://astro.badg.es/v2/built-with-starlight/tiny.svg)](https://starlight.astro.build)

It's [a Starlight app](https://starlight.astro.build) that is ultimately builds to static assets, then deployed to GitHub pages, and hosted at https://yay-machine.js.org/.

## Project Structure

Starlight looks for `.md` or `.mdx` files in the `src/content/docs/` directory. Each file is exposed as a route based on its file name. Sidebar config is in `astro.config.mjs`, but page titles/order is generally defined in the page's front matter.

Images can be added to `src/assets/` and embedded in Markdown with a relative link.

Static assets, like favicons, can be placed in the `public/` directory.

We have some custom CSS styles in `src/styles/custom.css`.

Custom components (increasingly mostly React) are in `src/components`.

## Commands

All commands are run from the root of the project, from a terminal:

| Command                                | Action                                           |
| :------------------------------------- | :----------------------------------------------- |
| `npm install`                          | Installs dependencies                            |
| `npm run site:dev`                     | Starts local site dev server at `localhost:4321` |
| `npm run site:build             `      | Build your production site to `./dist/`          |
| `npm run -w @yay-machine/site preview` | Preview your build locally, before deploying     |

In the `packages/site` directory:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## Want to learn more?

Check out [Starlight’s docs](https://starlight.astro.build/), read [the Astro documentation](https://docs.astro.build), or jump into the [Astro Discord server](https://astro.build/chat).
