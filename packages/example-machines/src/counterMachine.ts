import assert from "assert";
import { defineMachine } from "yay-machine";

export interface CounterState {
  readonly name: "counting";
  readonly count: number;
  readonly min: number;
  readonly max: number;
}

export interface CounterEvent {
  readonly type: "INC" | "DEC";
}

export const counterMachine = defineMachine<CounterState, CounterEvent>({
  initialState: {
    name: "counting",
    count: 0,
    min: Number.MIN_SAFE_INTEGER,
    max: Number.MAX_SAFE_INTEGER,
  },
  on: {
    INC: {
      to: "counting",
      data: ({ state }) => ({ ...state, count: state.count + 1 }),
      when: ({ state }) => state.count + 1 <= state.max,
    },
    DEC: {
      to: "counting",
      data: ({ state }) => ({ ...state, count: state.count - 1 }),
      when: ({ state }) => state.count - 1 >= state.min,
    },
  },
});

// Usage

// standard
const counter = counterMachine.newInstance().start();
assert.equal(counter.state.count, 0);

counter.send({ type: "INC" });
counter.send({ type: "INC" });
counter.send({ type: "INC" });
assert.equal(counter.state.count, 3);

counter.send({ type: "DEC" });
assert.equal(counter.state.count, 2);

// custom range
const range = counterMachine
  .newInstance({
    initialState: { name: "counting", count: 43, min: 0, max: 100 },
  })
  .start();
assert.equal(range.state.count, 43);
