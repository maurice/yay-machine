import assert from "assert";
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

// Usage

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
