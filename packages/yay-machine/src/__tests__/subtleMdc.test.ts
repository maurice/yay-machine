import { expect, test } from "bun:test";
import { YayMachine } from "../YayMachine";
import { defineMachine } from "../defineMachine";

test("machine[YayMachine.subtle.MDC] is the original machine definition ", () => {
  const mdc = {
    initialState: { name: "off" },
    states: {
      on: {
        on: { change: { to: "off" } },
      },
      off: {
        on: { change: { to: "on" } },
      },
    },
  } as const;
  const machineDefinition = defineMachine<
    { name: "on" | "off" },
    { type: "change" }
  >(mdc);

  const machine = machineDefinition.newInstance();
  expect(machine[YayMachine.subtle.MDC]).toBe(mdc);
});
