import { type ResultState, resultMachine } from "./resultMachine";

const result = resultMachine.newInstance().start();

// ... use the machine ...

// type-safe access to state-specific-data
const state: ResultState = result.state;
if (state.name === "result") {
  // biome-ignore lint/suspicious/noConsoleLog: example code
  console.log("OK, result is", state.result);
} else if (state.name === "error") {
  // biome-ignore lint/suspicious/noConsoleLog: example code
  console.log("OH NO, error is", state.errorMessage);
}
