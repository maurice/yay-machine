<p align="center">
  <a href="https://yay-machine.js.org/"><img src="https://github.com/user-attachments/assets/dcc997ee-faa8-465a-9ddf-3682b87ebb4e" alt="Logo"></a>
</p>

**yay-machine** is a modern, simple, lightweight, zero-dependency, TypeScript state-machine library.

## Modern

**yay-machine** borrows the best ideas from other JS/TypeScript state-machine and state-management libraries.

It will feel familiar to **XState** users, with features including

- JSON config
- state-data (context / extended-state / dynamic state)
- condition predicate functions (guards)
- immediate (always) transitions
- event handling in specific-state or any-state
- similar creation and lifecycle API

**yay-machine** also brings new ideas of its own

- states are types (think: `interface`). They are an `object` with a `name` and any associated data. Different states may have different associated data
- side-effects are all you need for sync/async interactions with the current machine and outside world

We use modern, accessible language, rather than traditional academic terms.

## Simple

**yay-machine** has only a handful of concepts and the API is minimal

- states
- events
- transitions
- side-effects

These features can be combined to model just about anything.

It should be quick to learn, and have a minimal ongoing cost-of-ownership.

## Lightweight

**yay-machine** is [a tiny package](https://bundlephobia.com/package/yay-machine@1.3.2) and won't bloat your app bundles.

[![yay-machine bundlephobia stats](./assets/bundlephobia-yay-machine.png "https://bundlephobia.com/package/yay-machine@1.3.2")](https://bundlephobia.com/package/yay-machine@1.3.2)

Minimal implementation means minimal overhead and you can trust **yay-machine** with your high-performance workloads.

[![bench tests](./assets/bench.png)](https://github.com/maurice/yay-machine/blob/main/packages/bench/src/bench.ts)

## Zero-dependency

The core **yay-machine** state-machine library has zero production dependencies.

It won't bloat your `node_modules/` and you won't have to worry about having to patch some security vulnerability or compatibility issue in a 3rd-party package that **yay-machine** depends on.

## TypeScript

We ❤️ TypeScript and want the best experience for TypeScript developers with state-machines.

A [**state** in **yay-machine**](./reference/state.md) is a type, giving you new ways to express your machine models with compile-time confidence.

## Where next?

Get up and running fast with our [quick start guide](./quick-start.md) or head over to the [reference docs](./reference/state.md).

If you're new to state-machines, [read our introduction](./articles/why-state-machines.md). If you already have some experience, learn [why **yay-machine** exists](./articles/why-yay-machine.md), and see the [comparison with **XState**](./articles/vs-xstate.md).

There are also [various examples](./examples/toggle.md) to demonstrate solving problems with with **yay-machine**.
