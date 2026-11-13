# @yay-machine/sprite-prep

Gets the dog sprite sheets ready for the site, ahead of time. Nothing here is
shipped: pages only load what it writes.

```sh
bun run site:sprites   # from the root of the project
```

It reads the catalog in `packages/site/src/sprites/dogCatalog.ts`, then writes
two files into `packages/site/src/assets/dogs/`:

- `dogs.kennel`: every sheet in the catalog, packed into one scrambled file.
- `measurements.json`: each sheet's frames, visible bounds and anchor, lined
  up with the dog's standing pose.

## The sheets

The purchased PNGs go in `sheets/` (the zip can live there too). The pack's
licence lets us use them but not hand them out, so git ignores that folder and
only keeps the scrambled kennel. Sheets come from `sheets/` first, then from the
existing kennel, so you only need the PNGs you're adding or replacing.

## Which way round

This package imports the site's sprite types, catalog and kennel format through
`@yay-machine/site/sprites/*`. The site never imports this package, so none of
the measuring code, or sharp, can end up in a page.

`bun test` here checks that the kennel and `measurements.json` match the
catalog. If they don't, run `bun run site:sprites`.
