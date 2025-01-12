import { expect, test } from "bun:test";
import type { MachineInstance } from "../MachineInstance";
import { defineMachine } from "../defineMachine";

test("when sending an event to the machine in onStart, the event is only handled after the machine has evaluated the initial state first", () => {
  const machine = defineMachine<{ name: "a" | "b" | "c" }, { type: "NEXT" }>({
    initialState: { name: "a" },
    states: {
      a: {
        always: { to: "b" },
        on: {
          NEXT: { to: "c" },
        },
      },
    },
    onStart({ send }) {
      send({ type: "NEXT" });
    },
  })
    .newInstance()
    .start();
  expect(machine.state).toEqual({ name: "b" });
});

test("when sending an event to the machine in onStart cleanup, the event is only handled after the machine has evaluated the initial state first", () => {
  const machine = defineMachine<{ name: "a" | "b" | "c" }, { type: "NEXT" }>({
    initialState: { name: "a" },
    states: {
      a: {
        always: { to: "b" },
        on: {
          NEXT: { to: "c" },
        },
      },
    },
    onStart({ send }) {
      return () => {
        send({ type: "NEXT" });
      };
    },
  })
    .newInstance()
    .start();
  expect(machine.state).toEqual({ name: "b" });

  machine.stop();
  expect(machine.state).toEqual({ name: "b" }); // still
});

test("when sending an event to the machine in onStart, the event is only handled after the machine has evaluated the initial state first (2)", () => {
  const machine = defineMachine<{ name: "a" | "b" | "c" }, { type: "NEXT" }>({
    initialState: { name: "a" },
    states: {
      a: {
        always: { to: "b" },
      },
      b: {
        on: {
          NEXT: { to: "c" },
        },
      },
    },
    onStart({ send }) {
      send({ type: "NEXT" });
    },
  })
    .newInstance()
    .start();
  expect(machine.state).toEqual({ name: "c" });
});

test("when sending an event to the machine in onStart cleanup, the event is only handled after the machine has evaluated the initial state first (2)", () => {
  const d = defineMachine<{ name: "a" | "b" | "c" }, { type: "NEXT" }>({
    initialState: { name: "a" },
    states: {
      a: {
        always: { to: "b" },
      },
      b: {
        on: {
          NEXT: { to: "c" },
        },
      },
    },
    onStart({ send }) {
      return () => {
        send({ type: "NEXT" });
      };
    },
  }).newInstance();
  const machine = d.start();
  expect(machine.state).toEqual({ name: "b" });

  machine.stop();
  expect(machine.state).toEqual({ name: "b" }); // still
});

test("when sending an event to the machine in the initial-state's onEnter, the event is only handled after the machine has evaluated the initial state first", () => {
  const machine = defineMachine<{ name: "a" | "b" | "c" }, { type: "NEXT" }>({
    initialState: { name: "a" },
    states: {
      a: {
        always: { to: "b" },
        on: {
          NEXT: { to: "c" },
        },
        onEnter({ send }) {
          send({ type: "NEXT" });
        },
      },
    },
  })
    .newInstance()
    .start();
  expect(machine.state).toEqual({ name: "b" });
});

test("when sending an event to the machine in the initial-state's onEnter, the event is only handled after the machine has evaluated the initial state first (2)", () => {
  const machine = defineMachine<{ name: "a" | "b" | "c" }, { type: "NEXT" }>({
    initialState: { name: "a" },
    states: {
      a: {
        always: { to: "b" },
        onEnter({ send }) {
          send({ type: "NEXT" });
        },
      },
      b: {
        on: {
          NEXT: { to: "c" },
        },
      },
    },
  })
    .newInstance()
    .start();
  expect(machine.state).toEqual({ name: "c" });
});

test("when sending an event to the machine in the initial-state's onEnter cleanup, the event is only handled after the machine has evaluated the initial state first (2)", () => {
  const machine = defineMachine<{ name: "a" | "b" | "c" }, { type: "NEXT" }>({
    initialState: { name: "a" },
    states: {
      a: {
        always: { to: "b" },
      },
      b: {
        on: {
          NEXT: { to: "c" },
        },
        onEnter({ send }) {
          return () => {
            send({ type: "NEXT" });
          };
        },
      },
    },
  })
    .newInstance()
    .start();
  expect(machine.state).toEqual({ name: "b" });
});

test("when sending an event to a machine in the current-state's onExit while the machine is stopping, the event is discarded", () => {
  const machine = defineMachine<{ name: "a" | "b" | "c" }, { type: "NEXT" }>({
    initialState: { name: "a" },
    states: {
      a: {
        always: { to: "b" },
      },
      b: {
        on: {
          NEXT: { to: "c" },
        },
        onExit({ send }) {
          send({ type: "NEXT" });
        },
      },
    },
  })
    .newInstance()
    .start();
  expect(machine.state).toEqual({ name: "b" });

  machine.stop();
  expect(machine.state).toEqual({ name: "b" });

  machine.start();
  expect(machine.state).toEqual({ name: "b" }); // still
});

test("error thrown if stopped while starting", () => {
  type State = { name: "a" | "b" | "c" };
  type Event = { type: "NEXT" };
  // biome-ignore lint/style/useConst: no other way
  let instance: MachineInstance<State, Event>;
  const machine = defineMachine<State, Event>({
    initialState: { name: "a" },
    states: {},
    onStart() {
      instance.stop();
    },
  });
  instance = machine.newInstance();
  expect(() => instance.start()).toThrow();
});

test("error thrown if started while stopping", () => {
  type State = { name: "a" | "b" | "c" };
  type Event = { type: "NEXT" };
  // biome-ignore lint/style/useConst: no other way
  let instance: MachineInstance<State, Event>;
  const machine = defineMachine<State, Event>({
    initialState: { name: "a" },
    states: {},
    onStop() {
      instance.start();
    },
  });
  instance = machine.newInstance().start();
  expect(() => instance.stop()).toThrow();
});
