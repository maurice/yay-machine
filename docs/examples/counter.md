# Counter (1, 2, 3, ...)

> 🏷️ `state data`\
> 🏷️ `any state + event transition`\
> 🏷️ `conditional transitions`

## About

A counter that can be incremented and decremented, with configurable min/max range.

Notice how the `INC` and `DEC` events are handled in **any state**, not a specific state.

> 💡 View this example's <a href="https://github.com/maurice/yay-machine/blob/main/packages/example-machines/src/counterMachine.ts" target="_blank">source</a> and <a href="https://github.com/maurice/yay-machine/blob/main/packages/example-machines/src/__tests__/counterMachine.test.ts" target="_blank">test</a> on GitHub

```typescript
import assert from "assert";
import { defineMachine } from "yay-machine";

interface CounterState {
  readonly name: "counting";
  readonly count: number;
  readonly min: number;
  readonly max: number;
}

interface CounterEvent {
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
```

## Usage

```typescript
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
```