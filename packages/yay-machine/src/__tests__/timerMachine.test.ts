import { expect, mock, test } from "bun:test";
import { defineMachine } from "../defineMachine";

interface IdleState {
  readonly name: "idle";
}

interface ActiveState {
  readonly time: number;
  readonly repeat: boolean;
}

interface RunningState extends ActiveState {
  readonly name: "running";
}

interface FiredState extends ActiveState {
  readonly name: "fired";
}

interface RunEvent {
  readonly type: "RUN";
  readonly time: number;
  readonly repeat?: boolean;
}

interface FiredEvent {
  readonly type: "FIRED";
}

interface CancelEvent {
  readonly type: "CANCEL";
}

const timerMachine = defineMachine<IdleState | RunningState | FiredState, RunEvent | FiredEvent | CancelEvent>({
  initialState: { name: "idle" },
  states: {
    idle: {
      on: {
        RUN: { to: "running", with: (_, { time, repeat }) => ({ time, repeat: repeat === true }) },
      },
    },
    running: {
      onEntry: (machine) => {
        const timer = setTimeout(() => machine.send({ type: "FIRED" }), machine.currentState.time);
        return () => clearTimeout(timer);
      },
      on: {
        FIRED: { to: "fired", with: ({ time, repeat }) => ({ time, repeat }) },
        CANCEL: { to: "idle" },
      },
    },
    fired: {
      always: [
        { to: "idle", when: ({ repeat }) => !repeat },
        { to: "running", with: ({ time, repeat }) => ({ time, repeat }) },
      ],
    },
  },
});

test("starts in idle state", () => {
  const machine = timerMachine.newInstance();
  expect(machine.currentState).toEqual({ name: "idle" });
});

test("can start single-use a timer", async () => {
  const machine = timerMachine.newInstance();
  const subscriber = mock();
  machine.subscribe(subscriber);
  machine.start();
  machine.send({ type: "RUN", time: 1000 });
  expect(subscriber).toHaveReturnedTimes(2);
  expect(subscriber).toHaveBeenLastCalledWith(
    { name: "running", time: 1000, repeat: false },
    { type: "RUN", time: 1000 },
  );
  await new Promise((resolve) => setTimeout(resolve, 1000));
  expect(subscriber).toHaveBeenCalledTimes(4);
  expect(subscriber).toHaveBeenNthCalledWith(
    3,
    {
      name: "fired",
      time: 1000,
      repeat: false,
    },
    {
      type: "FIRED",
    },
  );
  expect(subscriber).toHaveBeenNthCalledWith(
    4,
    {
      name: "idle",
    },
    undefined,
  );
});
