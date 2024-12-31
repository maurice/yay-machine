import { defineMachine } from "./defineMachine";

interface OffState {
  readonly name: "off";
}

interface OnState {
  readonly name: "on";
}

interface OffEvent {
  readonly type: "OFF";
}

interface OnEvent {
  readonly type: "ON";
}

const lightMachine = defineMachine<OffState | OnState, OffEvent | OnEvent>({
  initialState: { name: "off" },
  states: {
    off: {
      on: {
        ON: { to: "on" },
      },
    },
    on: {
      on: {
        OFF: { to: "off" },
      },
    },
  },
});

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
