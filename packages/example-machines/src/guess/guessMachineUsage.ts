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
