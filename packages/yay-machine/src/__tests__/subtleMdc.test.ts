import { expect, test } from "bun:test";
import { defineMachine } from "../defineMachine";
import { YayMachine } from "../YayMachine";

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
