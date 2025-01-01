import { defineMachine } from "../defineMachine";

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

/**
 * Models a switch - about as simple as it gets.
 */
export const switchMachine = defineMachine<OffState | OnState, OffEvent | OnEvent>({
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
