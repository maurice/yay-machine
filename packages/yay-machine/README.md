<p align="center">
  <a href="https://yay-machine.js.org/"><img src="https://github.com/user-attachments/assets/dcc997ee-faa8-465a-9ddf-3682b87ebb4e" alt="Logo"></a>
</p>


<p align="center">
<a href="https://github.com/maurice/yay-machine/actions/workflows/build.yml" title="build"><img src="https://github.com/maurice/yay-machine/workflows/build/badge.svg"/></a>
<a href="https://www.npmjs.com/package/yay-machine" title="NPM"><img src="https://img.shields.io/npm/v/yay-machine"/></a>
<img src="https://img.shields.io/coverallsCoverage/github/maurice/yay-machine"/>
</p>

<p align="center">
<a href="https://yay-machine.js.org/"><strong>yay-machine</strong> is a modern, simple, lightweight, zero-dependency, TypeScript state-machine library.</a>
</p>

---

*📦 This package is the core state-machine library.*

# Example

## Define the machine at compile-time

> 💡 View this example's <a href="https://github.com/maurice/yay-machine/blob/main/packages/example-machines/src/guessMachine.ts" target="_blank">source</a> and <a href="https://github.com/maurice/yay-machine/blob/main/packages/example-machines/src/__tests__/guessMachine.test.ts" target="_blank">test</a> on GitHub

```typescript
import assert from "assert";
import { defineMachine } from "yay-machine";

interface GuessState {
  readonly name:
    | "init"
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
}: { readonly state: GuessState }): GuessState => ({
  ...state,
  numGuesses: state.numGuesses + 1,
});

/**
 * Guess a number from 1 to 10
 */
export const guessMachine = defineMachine<
  GuessState,
  GuessEvent | NewGameEvent
>({
  initialState: { name: "init", answer: 0, numGuesses: 0, maxGuesses: 5 },
  states: {
    init: {
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
```

## Create instances and operate them at run-time

```typescript
const guess = guessMachine.newInstance().start();

while (guess.state.name === "playing") {
  guess.send({ type: "GUESS", guess: Math.ceil(Math.random() * 10) });
}

if (guess.state.name === "guessedCorrectly") {
  console.log("yay, we won :)");
} else if (guess.state.name === "tooManyIncorrectGuesses") {
  console.log("boo, we lost :(");
} else {
  assert.fail(`Invalid state: ${guess.state.name}`);
}
```

# What next?

* [About **yay-machine**](https://yay-machine.js.org/)
* [Quick Start](https://yay-machine.js.org/quick-start.html)
* [Various examples](https://yay-machine.js.org/examples/toggle.html)
* [Reference docs](https://yay-machine.js.org/reference/state.html)
* [Why state-machines?](https://yay-machine.js.org/articles/why-state-machines.html)
* [Why **yay-machine**?](https://yay-machine.js.org/articles/why-yay-machine.html)
* [**yay-machine** vs **XState**](https://yay-machine.js.org/articles/vs-xstate.html)
