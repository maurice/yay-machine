# Why **yay-machine**?

Why do we need another state-machine library?

Here at yay-machine HQ, [we ❤️ state machines](./why-state-machines.md) and think they suit a wide variety of domains, and want to see them used in more TypeScript code.

While there are already other well established state-machine libraries, are quite what we want.

## Too little

Some other state machine libraries are too simplistic. For example they might lack state-data, side-effects, conditional transitions or immediate transitions.

This limits their ability to model many real-world use cases.

Or else it moves the burden to implement such features to the user of the library but this may be impossible in some cases. Eg, a machine’s logical “current state” and any associated data should be updated atomically but if they are managed in different places at different times that’s asking for synchronization headaches and race issues.

Sometimes it's the TypeScript types that are insufficient. Eg the state-names might just be `string`s that we can't trust and force us to cast (rather than the exact names we define in our own code), or the fact that you are forced to share a single associated state-data type (aka "context") across all states.

## Too much

Some state-machine libraries are too complicated. 

They have a vast matrix of features and concepts. They have so much documentation. 

But they take weeks to learn and months to master.

They might only work with additional code-generation tools or IDE extensions; more complexity you don't need.

And all that functionality means a larger NPM package and larger app bundles.

## Just right

**yay-machine** aims for the sweet-spot: a handful of powerful primitives that together allow you handle just about anything, while keeping the number of concepts, the API surface and the implementation code small.

We want you to be up and running with **yay-machine** in hours and an expert in days.

## Goals

Our official project goals are

* To provide the best modern pragmatic state-machine library for TypeScript
* Strong TypeScript types without compromise
* Minimal feature-set and lightweight implementation for tiny bundle sizes and performance for your mission-critical workloads
* No code-generation or IDE extensions required

## Philosophy

### Keep it simple

Firstly we're not trying to be the most feature-rich TypeScript state-machine library (if you want that, use [XState](https://xstate.js.org/)). It's not that we don't like lots of features, but every features has a cost that the library maintainers bear; implementing a feature in a library may be trivial, but making it work with other existing features, documenting it, teaching it with examples, supporting it etc, take 100s more hours.

There's also a cost for developers using the library: more features means more time reading the docs, looking for examples, trying to get it working etc. And if you work on a project with other people and start using some new advanced features, your code may quickly become the thing that nobody else understands or wants to touch!

We believe a few powerful primitives go a long way; it's faster to learn and get working.

Specifically **yay-machine** doesn't currently support state-charts or any hierarchical or parallel state-machine definition: **yay-machine** currently only supports *flat state-machines*. In practice - in our experience - this isn't really a limiting factor. You can solve the same all problems that you might use a hierarchical state-machine for, just in different ways.

### Make it accessible

Second we like pragmatic and ergonomic library concepts and APIs. We may choose alternative names for existing concepts in the academic literature, or take a different path to other libraries if we think it makes more sense.

### Explicit types

Third we prefer explicit types to inferred types, and we ask you to BYOT (bring your own types) when defining your machines.

In our experience this provides the best TypeScript experience vs the library attempting to infer everything, and means that your types are the golden-source of the machine-states and events, and that the machine behaves as you expect.
