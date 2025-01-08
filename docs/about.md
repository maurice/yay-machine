<p align="center">
  <a href="https://github.com/maurice/yay-machine"><img src="https://github.com/user-attachments/assets/03dd78c1-4396-42c4-a32c-aaa7c927f09e" alt="Logo"></a>
</p>

**yay-machine** is a modern, simple, lightweight, zero-dependency, TypeScript state-machine library for the browser and server.

# Modern

**yay-machine** borrows the best ideas from other JS/TypeScript state-machine and state-management libraries.

It will feel familiar to **XState** users, with features including

- JSON config
- state-data (context / extended-state)
- condition predicate functions (guards)
- immediate (always) transitions
- event handling in specific-state or any-state
- similar creation and lifecycle API

**yay-machine** also brings new ideas of its own

- states are type (think: `interface`). They are an `object` with a `name` and any associated data. Different states may have different associated data
- side-effects are all you need for sync/async interactions with the current machine and outside world

We use modern, accessible language, rather than traditional academic terms.

# Simple

**yay-machine** has only a handful of concepts and the API is minimal

- states
- events
- transitions (including immediate and conditional)
- side-effects

These features can be combined to model just about anything.

It should be quick to learn, master, and have a low ongoing cost-of-ownership.

# Lightweight

**yay-machine** is a tiny package and won't bloat your app bundles.

- TODO include size stats

Minimal implementation means minimal overhead and you can trust **yay-machine** with your high-performance workloads.

- TODO include bench tests

# Zero-dependency

The core **yay-machine** state-machine library has zero production dependencies.

It won't bloat your `node_modules/` and you won't have to worry about having to patch some security vulnerability or compatibility issue in a 3rd-party package that **yay-machine** depends on.

# TypeScript

We ❤️ TypeScript and want the best experience for TypeScript developers with state-machines.

A [**state** in **yay-machine**](./reference/state.md) is a first-class type, giving you a lot of compile-time confidence in your machines.

# Continue

Read our [introduction to state-machines](./articles/why-state-machines.md) if you're new to them, or learn [why **yay-machine** exists](./articles/why-yay-machine.md) and a [comparison with **XState**](./articles/vs-xstate.md) if you are already familiar.

Get up and running fast with our [quick start guide](./quick-start.md) or head over to the [reference docs](./reference/).
