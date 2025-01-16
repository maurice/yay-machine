import { expect, test } from "bun:test";
import { type CalculatorState, calculatorMachine } from "../calculatorMachine1";

const sendKeys = (
  calculator: ReturnType<typeof calculatorMachine.newInstance>,
  keys: string,
) => {
  const split = keys.trim().split(/\s/);
  for (const key of split) {
    calculator.send({ type: "KEY", key });
  }
};

test("starts equals zero", () => {
  const calc = calculatorMachine.newInstance().start();
  expect(calc.state).toEqual({ name: "equals", memory: 0 });
});

const tests: [input: string, expected: CalculatorState][] = [
  ["1", { name: "equals", input: "1" }],
  ["1 +", { name: "plus", memory: 1 }],
  ["1 + 1", { name: "plus", memory: 1, input: "1" }],
  ["1 + 1 0", { name: "plus", memory: 1, input: "10" }],
  ["1 + 1 0 *", { name: "times", memory: 11 }],
  ["1 + 1 =", { name: "equals", memory: 2 }],
  ["2 + 2 =", { name: "equals", memory: 4 }],
  ["2 + 2 = 3", { name: "equals", input: "3" }],
  ["2 + 2 = 3 4", { name: "equals", input: "34" }],
  ["2 + 2 = 3 4 +", { name: "plus", memory: 34 }],
  ["2 + 2 = 3 4 + 7", { name: "plus", memory: 34, input: "7" }],
  ["2 + 2 = 3 4 + 7 1 =", { name: "equals", memory: 105 }],
  ["3 * 3 *", { name: "times", memory: 9 }],
  ["3 * 3 * 1 0", { name: "times", memory: 9, input: "10" }],
  ["3 * 3 * 1 0 +", { name: "plus", memory: 90 }],
  ["3 * 3 * 1 0 + =", { name: "equals", memory: 90 }],
  ["5 + 5 * +", { name: "plus", memory: 10 }],
  ["5 + 5 * + 1 0 *", { name: "times", memory: 20 }],
  ["5 + 5 * + 1 0 * 10", { name: "times", memory: 20, input: "10" }],
  ["5 + 5 * + 1 0 * 10 =", { name: "equals", memory: 200 }],
  ["5 + 5 * + 1 0 * 10 +", { name: "plus", memory: 200 }],
];

for (const [input, expected] of tests) {
  test(input, () => {
    const calc = calculatorMachine.newInstance().start();
    sendKeys(calc, input);
    expect(calc.state).toEqual(expected);
  });
}
