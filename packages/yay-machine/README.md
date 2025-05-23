<p align="center">
  <a href="https://yay-machine.js.org/"><img src="https://github.com/user-attachments/assets/80129f7d-5981-47e8-9092-78b6d755ef31" alt="Logo"></a>
</p>
<p align="center">
  <a href="https://yay-machine.js.org/"><img src="https://github.com/user-attachments/assets/e024314e-4616-496e-987d-ed636549bd79" alt="Doggie" width="250px"/></a>
</P>

<p align="center">
<a href="https://github.com/maurice/yay-machine/actions/workflows/build.yml" title="build"><img src="https://github.com/maurice/yay-machine/workflows/build/badge.svg"/></a>
<a href="https://www.npmjs.com/package/yay-machine" title="NPM"><img src="https://img.shields.io/npm/v/yay-machine"/></a>
<a href="https://coveralls.io/github/maurice/yay-machine" title="coverage"><img src="https://img.shields.io/coverallsCoverage/github/maurice/yay-machine"/></a>
</p>

<p align="center">
<a href="https://yay-machine.js.org/"><strong>yay-machine</strong> is a modern, simple, lightweight, zero-dependency, TypeScript state-machine library.</a>
</p>

---

# Why you should learn and use state-machines

![learn and use repeat state-machines](https://github.com/user-attachments/assets/8c3b547a-21b8-48e2-a482-cbd1ddbc4359)

State-machines have many desirable qualities, eg

- they are versatile, and can model many different problem domains
- they are declarative, focusing on the important "what", "when", "how" and "why" questions
- they are concise, conveying a lot of information in a small amount of co-located code
- they are extremely predictable
- and more

Read the [Why state-machines? article](https://yay-machine.js.org/articles/why-state-machines/) for more on this.

# `yay-machine` is a TypeScript state-machine library for everyone

Unlike other state-machine libraries that are complex and vast, or overly simplistic, `yay-machine` gives you power and flexibility without cognitive load.

Read the [About **yay-machine** article](https://yay-machine.js.org/) for more on this.

# Install

```sh
npm add yay-machine
```

# Example

## Define the machine at compile-time

> 💡 View this example's <a href="https://github.com/maurice/yay-machine/blob/main/packages/example-machines/src/guess/guessMachine.ts" target="_blank">source</a> and <a href="https://github.com/maurice/yay-machine/blob/main/packages/example-machines/src/guess/__tests__/guessMachine.test.ts" target="_blank">test</a> on GitHub

```typescript
// guessMachine.ts
import { defineMachine } from "yay-machine";

interface GuessState {
  readonly name:
    | "pickNumber"
    | "playing"
    | "guessedCorrectly"
    | "tooManyIncorrectGuesses";
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

const incrementNumGuesses = ({
  state,
}: {
  readonly state: GuessState;
}): GuessState => ({
  ...state,
  numGuesses: state.numGuesses + 1,
});

/**
 * Guess the number from 1 to 10
 */
export const guessMachine = defineMachine<
  GuessState,
  GuessEvent | NewGameEvent
>({
  initialState: { name: "pickNumber", answer: 0, numGuesses: 0, maxGuesses: 5 },
  states: {
    pickNumber: {
      always: {
        to: "playing",
        data: ({ state }) => ({
          ...state,
          answer: Math.ceil(Math.random() * 10),
          numGuesses: 0,
        }),
      },
    },
    playing: {
      on: {
        GUESS: [
          {
            to: "guessedCorrectly",
            when: ({ state, event }) => state.answer === event.guess,
            data: incrementNumGuesses,
          },
          {
            to: "tooManyIncorrectGuesses",
            when: ({ state }) => state.numGuesses + 1 === state.maxGuesses,
            data: incrementNumGuesses,
          },
          {
            to: "playing",
            data: incrementNumGuesses,
          },
        ],
      },
    },
    guessedCorrectly: {
      on: {
        NEW_GAME: { to: "pickNumber", data: ({ state }) => state },
      },
    },
    tooManyIncorrectGuesses: {
      on: {
        NEW_GAME: { to: "pickNumber", data: ({ state }) => state },
      },
    },
  },
});
```

## Create instances and operate them at run-time

```typescript
import assert from "assert";
import { guessMachine } from "./guessMachine";

// create and start a new instance of the guess game machine
const guess = guessMachine.newInstance().start();
assert(guess.state.name === "playing");

// subscribe to the machine's state as it changes
const unsubscribe = guess.subscribe(({ state }) => {
  if (state.name === "guessedCorrectly") {
    console.log("game over: yay, we won :)");
  } else if (state.name === "tooManyIncorrectGuesses") {
    console.log("game over: boo, we lost :(");
  } else {
    return;
  }
  unsubscribe();
});

// play a single game
while (guess.state.name === "playing") {
  guess.send({ type: "GUESS", guess: Math.ceil(Math.random() * 10) });
}
```

# Where next?

- [About **yay-machine** ➜](https://yay-machine.js.org/)
- [Quick Start ➜](https://yay-machine.js.org/quick-start/)
- [Various examples ➜](https://yay-machine.js.org/examples/toggle/)
- [Reference docs ➜](https://yay-machine.js.org/reference/state/)
- [Why state-machines? ➜](https://yay-machine.js.org/articles/why-state-machines/)
- [Why **yay-machine**? ➜](https://yay-machine.js.org/articles/why-yay-machine/)
- [**yay-machine** vs **XState** ➜](https://yay-machine.js.org/articles/vs-xstate/)
