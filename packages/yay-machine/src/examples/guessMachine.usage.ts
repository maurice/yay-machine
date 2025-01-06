import { guessMachine } from "./guessMachine";

const guess = guessMachine.newInstance().start();

for (let i = 0; guess.state.name === "playing"; i++) {
  guess.send({ type: "GUESS", guess: i + 1 });
}

if (guess.state.name === "guessedCorrectly") {
  // biome-ignore lint/suspicious/noConsoleLog: example code
  console.log("yay, we won :)");
}
if (guess.state.name === "tooManyIncorrectGuesses") {
  // biome-ignore lint/suspicious/noConsoleLog: example code
  console.log("boo, we lost :(");
}
