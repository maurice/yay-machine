import { expect, test } from "bun:test";
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
