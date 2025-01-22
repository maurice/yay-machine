import { expect, test } from "bun:test";
import type { SendFunction } from "../MachineDefinitionConfig";
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

test("error thrown if stopped while stopped", () => {
  type State = { name: "a" | "b" | "c" };
  type Event = { type: "NEXT" };
  const machine = defineMachine<State, Event>({
    initialState: { name: "a" },
    states: {},
  }).newInstance();
  expect(() => machine.stop()).toThrow();
});

test("error sending an event while stopped", () => {
  type State = { name: "a" | "b" | "c" };
  type Event = { type: "NEXT" };
  const machine = defineMachine<State, Event>({
    initialState: { name: "a" },
    states: {},
  }).newInstance();
  expect(() => machine.send({ type: "NEXT" })).toThrow();
});

test("error thrown if started while started", () => {
  type State = { name: "a" | "b" | "c" };
  type Event = { type: "NEXT" };
  const machine = defineMachine<State, Event>({
    initialState: { name: "a" },
    states: {},
  })
    .newInstance()
    .start();
  expect(() => machine.start()).toThrow();
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

test("events sent after onStart side effect is cleaned up are ignored", () => {
  type State = { name: "a" | "b" | "c" };
  type Event = { type: "NEXT" };
  let capturedSend: SendFunction<Event>;
  const machine = defineMachine<State, Event>({
    initialState: { name: "a" },
    states: {
      a: {
        on: {
          NEXT: { to: "b" },
        },
      },
      b: {
        on: {
          NEXT: { to: "c" },
        },
      },
    },
    onStart({ send }) {
      capturedSend = send;
      return () => {
        send({ type: "NEXT" });
      };
    },
  })
    .newInstance()
    .start();
  expect(machine.state.name).toBe("a");
  machine.stop();
  capturedSend!({ type: "NEXT" });
  expect(machine.state.name).toBe("a");

  machine.start();
  expect(machine.state.name).toBe("a");
});

test("events sent in onStop side effect are ignored", () => {
  type State = { name: "a" | "b" | "c" };
  type Event = { type: "NEXT" };
  const machine = defineMachine<State, Event>({
    initialState: { name: "a" },
    states: {
      a: {
        on: {
          NEXT: { to: "b" },
        },
      },
    },
    // @ts-expect-error: not advertised
    onStop({ send }) {
      send({ type: "NEXT" });
      return () => {
        send({ type: "NEXT" });
      };
    },
  })
    .newInstance()
    .start();
  expect(machine.state.name).toBe("a");
  machine.stop();
  expect(machine.state.name).toBe("a");
  machine.start();
  expect(machine.state.name).toBe("a");
});

test("events sent after onEnter side effect is cleaned up are ignored", () => {
  type State = { name: "a" | "b" | "c" };
  type Event = { type: "NEXT" };
  let capturedSend: SendFunction<Event>;
  const machine = defineMachine<State, Event>({
    initialState: { name: "a" },
    states: {
      a: {
        onEnter({ send }) {
          capturedSend = send;
          return () => {
            send({ type: "NEXT" });
          };
        },
        on: {
          NEXT: { to: "b" },
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
  expect(machine.state.name).toBe("a");
  machine.send({ type: "NEXT" });
  expect(machine.state.name).toBe("b");
  capturedSend!({ type: "NEXT" });
  expect(machine.state.name).toBe("b");
});

test("events sent after onExit side effect is cleaned up are ignored", () => {
  type State = { name: "a" | "b" | "c" };
  type Event = { type: "NEXT" };
  let capturedSend: SendFunction<Event>;
  const machine = defineMachine<State, Event>({
    initialState: { name: "a" },
    states: {
      a: {
        onExit({ send }) {
          capturedSend = send;
        },
        on: {
          NEXT: { to: "b" },
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
  expect(machine.state.name).toBe("a");
  machine.send({ type: "NEXT" });
  expect(machine.state.name).toBe("b");
  capturedSend!({ type: "NEXT" });
  expect(machine.state.name).toBe("b");
});

test("events sent after onTransition side effect is cleaned up are ignored", () => {
  type State = { name: "a" | "b" | "c" };
  type Event = { type: "NEXT" };
  let capturedSend: SendFunction<Event>;
  const machine = defineMachine<State, Event>({
    initialState: { name: "a" },
    states: {
      a: {
        on: {
          NEXT: {
            to: "b",
            onTransition({ send }) {
              capturedSend = send;
            },
          },
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
  expect(machine.state.name).toBe("a");
  machine.send({ type: "NEXT" });
  expect(machine.state.name).toBe("b");
  capturedSend!({ type: "NEXT" });
  expect(machine.state.name).toBe("b");
});

test("events sent after reenter:false onTransition side effect is cleaned up are ignored", () => {
  type State = { name: "a" | "b" | "c"; data: number };
  type Event = { type: "NEXT" };
  let capturedSend: SendFunction<Event>;
  const machine = defineMachine<State, Event>({
    initialState: { name: "a", data: 0 },
    states: {
      a: {
        on: {
          NEXT: {
            to: "a",
            reenter: false,
            onTransition({ send }) {
              capturedSend = send;
            },
          },
        },
      },
      b: {
        on: {
          NEXT: { to: "c", data: () => ({ data: 3 }) },
        },
      },
    },
  })
    .newInstance()
    .start();
  expect(machine.state.name).toBe("a");
  machine.send({ type: "NEXT" });
  const currentState = machine.state;
  capturedSend!({ type: "NEXT" });
  expect(machine.state).toBe(currentState);
});

test("always transitions precede events (sent by onEnter in initial state)", () => {
  type State = { name: "a" | "b" | "c" };
  type Event = { type: "B" };
  const machine = defineMachine<State, Event>({
    initialState: { name: "a" },
    states: {
      a: {
        onEnter: ({ send }) => send({ type: "B" }),
        on: {
          B: { to: "b" },
        },
        always: {
          to: "c",
        },
      },
    },
  })
    .newInstance()
    .start();
  expect(machine.state.name).toBe("c");
});
test("always transitions precede events (sent by onEnter in future state)", () => {
  type State = { name: "a" | "b" | "c" | "d" };
  type Event = { type: "B" | "C" };
  const machine = defineMachine<State, Event>({
    initialState: { name: "a" },
    states: {
      a: {
        on: {
          B: { to: "b" },
        },
      },
      b: {
        onEnter: ({ send }) => send({ type: "C" }),
        on: {
          C: { to: "c" },
        },
        always: {
          to: "d",
        },
      },
    },
  })
    .newInstance()
    .start();
  machine.send({ type: "B" });
  expect(machine.state.name).toBe("d");
});

test("always transitions precede events (sent by onExit in initial state)", () => {
  type State = { name: "a" | "b" | "c" };
  type Event = { type: "B" };
  const machine = defineMachine<State, Event>({
    initialState: { name: "a" },
    states: {
      a: {
        onExit: ({ send }) => send({ type: "B" }),
        on: {
          B: { to: "b" },
        },
        always: {
          to: "c",
        },
      },
    },
  })
    .newInstance()
    .start();
  expect(machine.state.name).toBe("c");
});

test("always transitions precede events (sent by onExit in future state)", () => {
  type State = { name: "a" | "b" | "c" | "d" };
  type Event = { type: "B" | "C" };
  const machine = defineMachine<State, Event>({
    initialState: { name: "a" },
    states: {
      a: {
        on: {
          B: { to: "b" },
        },
      },
      b: {
        onExit: ({ send }) => send({ type: "C" }),
        on: {
          C: { to: "c" },
        },
        always: {
          to: "d",
        },
      },
    },
  })
    .newInstance()
    .start();
  machine.send({ type: "B" });
  expect(machine.state.name).toBe("d");
});

test("always transitions are non-recursive and won't cause stack-overflow errors", () => {
  type State = { name: "a"; iteration: number };
  type Event = { type: "NEXT" };
  const machine = defineMachine<State, Event>({
    initialState: { name: "a", iteration: 0 },
    states: {
      a: {
        always: {
          to: "a",
          when: ({ state }) => state.iteration < 10_000,
          data: ({ state }) => ({ iteration: state.iteration + 1 }),
        },
      },
    },
  })
    .newInstance()
    .start();
  expect(machine.state.name).toBe("a");
});
