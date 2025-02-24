import { expect, test } from "bun:test";
import { defineMachine } from "../defineMachine";

test("no data", () => {
  const machine = defineMachine<{ name: "on" | "off" }, { type: "change" }>({
    initialState: { name: "off" },
    states: {
      on: {
        on: { change: { to: "off" } },
      },
      off: {
        on: { change: { to: "on" } },
      },
    },
  })
    .newInstance()
    .start();
  expect(machine.state.name).toEqual("off");
  machine.send({ type: "change" });
  expect(machine.state.name).toEqual("on");
});

test("data", () => {
  const machine = defineMachine<
    { name: "on" | "off"; times: number },
    { type: "change" }
  >({
    initialState: { name: "off", times: 0 },
    states: {
      on: {
        on: { change: { to: "off", data: ({ state }) => state } },
      },
      off: {
        on: {
          change: {
            to: "on",
            data: ({ state }) => ({ times: state.times + 1 }),
          },
        },
      },
    },
  })
    .newInstance()
    .start();
  expect(machine.state).toEqual({ name: "off", times: 0 });
  machine.send({ type: "change" });
  expect(machine.state).toEqual({ name: "on", times: 1 });
  machine.send({ type: "change" });
  expect(machine.state).toEqual({ name: "off", times: 1 });
  machine.send({ type: "change" });
  expect(machine.state).toEqual({ name: "on", times: 2 });
});

test("homogenous data + enableCopyDataOnTransition", () => {
  const machine = defineMachine<
    { name: "on" | "off"; times: number },
    { type: "change" }
  >({
    enableCopyDataOnTransition: true,
    initialState: { name: "off", times: 0 },
    states: {
      on: {
        on: { change: { to: "off" } },
      },
      off: {
        on: {
          change: {
            to: "on",
            data: ({ state }) => ({ times: state.times + 1 }),
          },
        },
      },
    },
  })
    .newInstance()
    .start();
  expect(machine.state).toEqual({ name: "off", times: 0 });
  machine.send({ type: "change" });
  expect(machine.state).toEqual({ name: "on", times: 1 });
  machine.send({ type: "change" });
  expect(machine.state).toEqual({ name: "off", times: 1 });
  machine.send({ type: "change" });
  expect(machine.state).toEqual({ name: "on", times: 2 });
});

test("conditional specific state + event", () => {
  const abcMachine = defineMachine<
    { name: "a" | "b" | "c" },
    { type: "goto"; next: "a" | "b" | "c" }
  >({
    initialState: { name: "a" },
    states: {
      a: {
        on: {
          goto: [
            { to: "a", when: ({ event }) => event.next === "a" },
            { to: "b", when: ({ event }) => event.next === "b" },
            { to: "c" },
          ],
        },
      },
    },
  });
  let abc = abcMachine.newInstance().start();
  abc.send({ type: "goto", next: "a" });
  expect(abc.state.name).toEqual("a");

  abc = abcMachine.newInstance().start();
  abc.send({ type: "goto", next: "b" });
  expect(abc.state.name).toEqual("b");

  abc = abcMachine.newInstance().start();
  abc.send({ type: "goto", next: "c" });
  expect(abc.state.name).toEqual("c");
});

test("conditional any state + event", () => {
  const abcMachine = defineMachine<
    { name: "a" | "b" | "c" },
    { type: "goto"; next: "a" | "b" | "c" }
  >({
    initialState: { name: "a" },
    on: {
      goto: [
        { to: "a", when: ({ event }) => event.next === "a" },
        { to: "b", when: ({ event }) => event.next === "b" },
        { to: "c" },
      ],
    },
  });
  let abc = abcMachine.newInstance().start();
  abc.send({ type: "goto", next: "a" });
  expect(abc.state.name).toEqual("a");

  abc = abcMachine.newInstance().start();
  abc.send({ type: "goto", next: "b" });
  expect(abc.state.name).toEqual("b");

  abc = abcMachine.newInstance().start();
  abc.send({ type: "goto", next: "c" });
  expect(abc.state.name).toEqual("c");
});

test("always no data in initial state", () => {
  const abc = defineMachine<{ name: "a" | "b" | "c" }, { type: "next" }>({
    initialState: { name: "a" },
    states: {
      a: {
        always: { to: "b" },
      },
    },
  })
    .newInstance()
    .start();
  expect(abc.state.name).toEqual("b");
});

test("always no data in later state", () => {
  const abc = defineMachine<{ name: "a" | "b" | "c" }, { type: "next" }>({
    initialState: { name: "a" },
    states: {
      a: {
        on: { next: { to: "b" } },
      },
      b: {
        always: { to: "c" },
      },
    },
  })
    .newInstance()
    .start();
  expect(abc.state.name).toEqual("a");
  abc.send({ type: "next" });
  expect(abc.state.name).toEqual("c");
});
