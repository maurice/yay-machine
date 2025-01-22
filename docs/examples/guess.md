# Guess a number

> 🏷️ `state data`\
> 🏷️ `any state + event transition`\
> 🏷️ `conditional transitions`\
> 🏷️ `immediate (always) transition`

## About

Models the "Guess a random number from 1 to 10" game.

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

## Usage

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