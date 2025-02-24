import { expect, test } from "bun:test";
import { defineMachine } from "../defineMachine";

type MachineState = { name: "machine"; data: number };

type MachineEvent = { type: "EVENT" };

test("no error for valid definition", () => {
  expect(() =>
    defineMachine<MachineState, MachineEvent>({
      initialState: { name: "machine", data: 0 },
      states: {},
    }),
  ).not.toThrow();
});

test("no error for regular (non-reenter) on state + event transition with data callback", () => {
  expect(() =>
    defineMachine<MachineState, MachineEvent>({
      initialState: { name: "machine", data: 0 },
      states: {
        machine: {
          on: {
            EVENT: {
              to: "machine",
              data: () => ({ data: 1 }),
            },
          },
        },
      },
    }),
  ).not.toThrow();

  expect(() =>
    defineMachine<MachineState, MachineEvent>({
      initialState: { name: "machine", data: 0 },
      states: {
        machine: {
          on: {
            EVENT: [
              {
                to: "machine",
                data: () => ({ data: 1 }),
              },
            ],
          },
        },
      },
    }),
  ).not.toThrow();
});

test("no error for reenter:false on state + event transition without data callback", () => {
  expect(() =>
    defineMachine<MachineState, MachineEvent>({
      initialState: { name: "machine", data: 0 },
      states: {
        machine: {
          on: {
            EVENT: {
              to: "machine",
              reenter: false,
            },
          },
        },
      },
    }),
  ).not.toThrow();

  expect(() =>
    defineMachine<MachineState, MachineEvent>({
      initialState: { name: "machine", data: 0 },
      states: {
        machine: {
          on: {
            EVENT: [
              {
                to: "machine",
                reenter: false,
              },
            ],
          },
        },
      },
    }),
  ).not.toThrow();
});

test("error for reenter on state immediate transition", () => {
  expect(() =>
    defineMachine<MachineState, MachineEvent>({
      initialState: { name: "machine", data: 0 },
      states: {
        machine: {
          always: {
            to: "machine",
            // @ts-expect-error: not valid for immediate transitions
            reenter: false,
          },
        },
      },
    }),
  ).toThrow();

  expect(() =>
    defineMachine<MachineState, MachineEvent>({
      initialState: { name: "machine", data: 0 },
      states: {
        machine: {
          always: [
            {
              to: "machine",
              // @ts-expect-error: not valid for immediate transitions
              reenter: false,
            },
          ],
        },
      },
    }),
  ).toThrow();

  expect(() =>
    defineMachine<MachineState, MachineEvent>({
      initialState: { name: "machine", data: 0 },
      states: {
        machine: {
          always: {
            to: "machine",
            // @ts-expect-error: not valid for immediate transitions
            reenter: true,
          },
        },
      },
    }),
  ).toThrow();

  expect(() =>
    defineMachine<MachineState, MachineEvent>({
      initialState: { name: "machine", data: 0 },
      states: {
        machine: {
          always: [
            {
              to: "machine",
              // @ts-expect-error: reenter not allowed in this context
              reenter: true,
            },
          ],
        },
      },
    }),
  ).toThrow();
});

test("no error for reenter:true on state + event transition with data", () => {
  expect(() =>
    defineMachine<MachineState, MachineEvent>({
      initialState: { name: "machine", data: 0 },
      states: {
        machine: {
          on: {
            // @ts-expect-error: reenter:true not allowed here, but it is the actual behaviour
            EVENT: {
              to: "machine",
              data: () => ({ data: 1 }),
              reenter: true,
            },
          },
        },
      },
    }),
  ).not.toThrow();

  expect(() =>
    defineMachine<MachineState, MachineEvent>({
      initialState: { name: "machine", data: 0 },
      states: {
        machine: {
          on: {
            EVENT: [
              // @ts-expect-error: reenter:true not allowed here, but it is the actual behaviour
              {
                to: "machine",
                data: () => ({ data: 1 }),
                reenter: true,
              },
            ],
          },
        },
      },
    }),
  ).not.toThrow();
});

test("error for reenter:false on state + event transition with data", () => {
  expect(() =>
    defineMachine<MachineState | { name: "otherState" }, MachineEvent>({
      initialState: { name: "machine", data: 0 },
      states: {
        machine: {
          on: {
            EVENT: {
              to: "machine",
              reenter: false,
              // oops this should be a type error !?
              data: () => ({ data: 0 }),
            },
          },
        },
      },
    }),
  ).toThrow();

  expect(() =>
    defineMachine<MachineState | { name: "otherState" }, MachineEvent>({
      initialState: { name: "machine", data: 0 },
      states: {
        machine: {
          on: {
            EVENT: [
              {
                to: "otherState",
                // @ts-expect-error: reenter not allowed here
                reenter: false,
                // oops this should be a type error !?
                data: () => ({ data: 0 }),
              },
            ],
          },
        },
      },
    }),
  ).toThrow();
});

test("error for reenter:false on state + event transition with data to another state", () => {
  expect(() =>
    defineMachine<MachineState | { name: "otherState" }, MachineEvent>({
      initialState: { name: "machine", data: 0 },
      states: {
        machine: {
          on: {
            EVENT: {
              to: "otherState",
              // @ts-expect-error: reenter not allowed here
              reenter: false,
              data: () => ({ data: 0 }),
            },
          },
        },
      },
    }),
  ).toThrow();

  expect(() =>
    defineMachine<MachineState | { name: "otherState" }, MachineEvent>({
      initialState: { name: "machine", data: 0 },
      states: {
        machine: {
          on: {
            EVENT: [
              {
                to: "otherState",
                // @ts-expect-error: reenter not allowed here
                reenter: false,
                data: () => ({ data: 0 }),
              },
            ],
          },
        },
      },
    }),
  ).toThrow();
});
