# **yay-machine** is a modern, simple, lightweight, zero-dependency, TypeScript state-machine library for the browser and server

```typescript
import { type CallbackParams, defineMachine } from 'yay-machine';

interface GuessState {
  readonly name: "init" | "playing" | "guessedCorrectly" | "tooManyIncorrectGuesses";
  readonly answer: number;
  readonly numGuesses: number;
  readonly maxGuesses: number;
}

interface GuessEvent {
  readonly type: "GUESS";
  readonly guess: number;
}

interface NewGameEvent {
  readonly type: "NEW_GAME";
}

const incrementNumGuesses = ({ state }: CallbackParams<GuessState, GuessEvent>): GuessState => ({
  ...state,
  numGuesses: state.numGuesses + 1,
});

// guess a number from 1 to 10
export const guessMachine = defineMachine<GuessState, GuessEvent | NewGameEvent>({
  initialState: { name: "init", answer: 0, numGuesses: 0, maxGuesses: 5 },
  states: {
    init: {
      always: {
        to: "playing",
        data: ({ state }) => ({ ...state, answer: Math.ceil(Math.random() * 10), numGuesses: 0 }),
      },
    },
    playing: {
      on: {
        GUESS: [
          {
            to: "tooManyIncorrectGuesses",
            when: ({ state }) => state.numGuesses + 1 === state.maxGuesses,
            data: incrementNumGuesses,
          },
          {
            to: "guessedCorrectly",
            when: ({ state, event }) => state.answer === event.guess,
            data: incrementNumGuesses,
          },
          {
            to: "playing",
            data: incrementNumGuesses,
          },
        ],
      },
    },
  },
  on: {
    NEW_GAME: { to: "init" },
  },
});

const guess = guessMachine.newInstance().start();

for (let i = 0; guess.state.name === "playing"; i++) {
  guess.send({ type: "GUESS", guess: i + 1 });
}

if (guess.state.name === "guessedCorrectly") {
  console.log("yay, we won :)");
}
if (guess.state.name === "tooManyIncorrectGuesses") {
  console.log("boo, we lost :(");
}
```

## Dive in

Read our [introduction to state-machines](./articles/why-state-machines.md) if you're new to them, or learn [why **yay-machine** exists](./articles/why-yay-machine.md) or the [comparison with **XState**](./articles/vs-xstate.md) if you are already familiar.

Get up and running fast with our [quick start guide](./quick-start.md) or head over to the [reference docs](./reference/).

# Modern

**yay-machine** borrows the best ideas from other JS/TypeScript state-machine and state-management libraries. **yay-machine** will feel familiar to **XState** users, with features including

- JSON config
- state-data (context / extended-state)
- condition predicate functions (guards)
- immediate (always) transitions
- event handling in specific-state or any-state
- similar creation and lifecycle API

**yay-machine** also brings new ideas of its own

- states are `type`s (or `interface`s). They are a `name` and any associated data. Different states may have different associated data
- side-effects are all you need for sync/async interactions with the current machine and outside world

# Simple

**yay-machine** has only a handful of concepts and the API is minimal

- states
- events
- transitions (including immediate and conditions)
- side-effects

It should be quick to learn and master and have a low ongoing cost-of-ownership.

# Lightweight

**yay-machine** is a tiny package and won't bloat your app bundles.

- size comparison

The less code a library has, the faster your app runs.

- perf tests needed

# Zero-dependency

The core **yay-machine** state-machine library has zero production dependencies.

It won't bloat your `node_modules/` and you won't have to worry about having to patch some security vulnerability or compatibility issue in a 3rd-party package that **yay-machine** depends on.

# TypeScript

We ❤️ TypeScript and want the best experience for TypeScript developers with state-machines.

A state in **yay-machine** is a first-class `type` (or `interface`), giving you a lot of compile-time confidence in your machines.

The example below demonstrates our this with state-specific-data (aka heterogenous state-data), but we also support state-common-data (aka homogenous state-data).

```typescript
export type ResultState =
  | { readonly name: "pending" }
  | { readonly name: "result"; readonly result: unknown }
  | { readonly name: "error"; readonly errorMessage: string };

export type ResultEvent =
  | { readonly type: "RESULT"; readonly result: unknown }
  | { readonly type: "ERROR"; readonly error: Error };

export const resultMachine = defineMachine<ResultState, ResultEvent>({
  initialState: { name: "pending" },
  states: {
    pending: {
      on: {
        RESULT: {
          to: "result",
          data: ({ event }) => ({ result: event.result }),
        },
        ERROR: {
          to: "error",
          data: ({ event }) => ({ errorMessage: String(event.error) }),
        },
      },
    },
  },
});

const result = resultMachine.newInstance().start();

// ... use the machine ...

// type-safe access to state-specific-data
const state: ResultState = result.state;
if (state.name === "result") {
  console.log("OK, result is", state.result);           
} else if (state.name === "error") {
  console.log("OH NO, error is", state.errorMessage);
}
```
