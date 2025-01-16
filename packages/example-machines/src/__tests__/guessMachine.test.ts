import { expect, test } from "bun:test";
import { guessMachine } from "../guessMachine";

test("starts in playing state with a random number between 1 and 10", () => {
  const guess = guessMachine.newInstance().start();
  expect(guess.state).toEqual({
    name: "playing",
    numGuesses: 0,
    maxGuesses: 5,
    answer: expect.any(Number),
  });
});

test("guesses eventually lead to final states", () => {
  const guess = guessMachine.newInstance().start();
  for (let i = 0; guess.state.name === "playing"; i++) {
    guess.send({ type: "GUESS", guess: i + 1 });
  }
  expect(guess.state.name).toBeOneOf([
    "guessedCorrectly",
    "tooManyIncorrectGuesses",
  ]);
});
