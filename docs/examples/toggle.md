# Toggle (on/off)

> 🏷️ `transitions`\
> 🏷️ `events`

## About

A very simple state-machine modelling a binary control, and demonstrating basic transitions.

> 💡 View this example's <a href="https://github.com/maurice/yay-machine/blob/main/packages/example-machines/src/toggleMachine.ts" target="_blank">source</a> and <a href="https://github.com/maurice/yay-machine/blob/main/packages/example-machines/src/__tests__/toggleMachine.test.ts" target="_blank">test</a> on GitHub

```typescript
import assert from "assert";
import { defineMachine } from "yay-machine";

interface ToggleState {
  readonly name: "off" | "on";
}

interface ToggleEvent {
  readonly type: "TOGGLE";
}

export const toggleMachine = defineMachine<ToggleState, ToggleEvent>({
  initialState: { name: "off" },
  states: {
    off: {
      on: { TOGGLE: { to: "on" } },
    },
    on: {
      on: { TOGGLE: { to: "off" } },
    },
  },
});
```

## Usage

```typescript
const toggle = toggleMachine.newInstance().start();
assert.deepStrictEqual(toggle.state, { name: "off" });

toggle.send({ type: "TOGGLE" });
assert.deepStrictEqual(toggle.state, { name: "on" });

toggle.send({ type: "TOGGLE" });
assert.deepStrictEqual(toggle.state, { name: "off" });
```