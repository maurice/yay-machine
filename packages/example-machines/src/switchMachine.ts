import assert from "assert";
import { defineMachine } from "yay-machine";

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
export const switchMachine = defineMachine<
  OffState | OnState,
  OffEvent | OnEvent
>({
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

// Usage

const switchy = switchMachine.newInstance().start();
assert.deepStrictEqual(switchy.state, { name: "off" });

switchy.send({ type: "ON" });
assert.deepStrictEqual(switchy.state, { name: "on" });

switchy.send({ type: "ON" });
assert.deepStrictEqual(switchy.state, { name: "on" }); // still

switchy.send({ type: "OFF" });
assert.deepStrictEqual(switchy.state, { name: "off" });
