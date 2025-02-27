import { expect, test } from "bun:test";
import { counterMachine } from "../counterMachine";
import "../counterMachineUsage"; // sanity check the documented example

test("starts at zero by default, can increment and decrement", () => {
  const counter = counterMachine.newInstance().start();
  expect(counter.state.count).toEqual(0);

  counter.send({ type: "INC" });
  counter.send({ type: "INC" });
  counter.send({ type: "INC" });
  expect(counter.state.count).toEqual(3);

  counter.send({ type: "DEC" });
  expect(counter.state.count).toEqual(2);
});

test("can be started at any number and with custom range", () => {
  const counter = counterMachine
    .newInstance({
      initialState: { name: "counting", count: 50, min: 45, max: 55 },
    })
    .start();
  expect(counter.state.count).toEqual(50);

  counter.send({ type: "DEC" });
  counter.send({ type: "DEC" });
  counter.send({ type: "DEC" });
  expect(counter.state.count).toEqual(47);

  counter.send({ type: "INC" });
  expect(counter.state.count).toEqual(48);

  for (let i = 0; i < 10; i++) {
    counter.send({ type: "INC" });
  }
  expect(counter.state.count).toEqual(55);

  for (let i = 0; i < 20; i++) {
    counter.send({ type: "DEC" });
  }
  expect(counter.state.count).toEqual(45);
});
