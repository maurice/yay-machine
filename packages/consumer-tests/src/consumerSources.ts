/**
 * The same toggle machine in each flavour a consumer might write it.
 * Every variant ends in the "on" state.
 */

const machineConfig = `{
  initialState: { name: "off" },
  states: {
    off: { on: { TOGGLE: { to: "on" } } },
    on: { on: { TOGGLE: { to: "off" } } },
  },
}`;

export const EXPECTED_STATE = "on";

const jsBody = `const machine = defineMachine(${machineConfig}).newInstance().start();
machine.send({ type: "TOGGLE" });`;

export const esmSource = `import { defineMachine } from "yay-machine";

${jsBody}
console.log(machine.state.name);
`;

export const cjsSource = `const { defineMachine } = require("yay-machine");

${jsBody}
console.log(machine.state.name);
`;

export const browserSource = `import { defineMachine } from "yay-machine";

${jsBody}
document.body.dataset.state = machine.state.name;
`;

/**
 * Fails to type-check unless real types are resolved: an unresolved or
 * `any`-typed import would make the `@ts-expect-error` unused.
 */
export const typedSource = `import { defineMachine, type MachineInstance } from "yay-machine";

interface ToggleState {
  readonly name: "off" | "on";
}

interface ToggleEvent {
  readonly type: "TOGGLE";
}

const toggle = defineMachine<ToggleState, ToggleEvent>(${machineConfig});

const machine: MachineInstance<ToggleState, ToggleEvent> = toggle
  .newInstance()
  .start();
machine.send({ type: "TOGGLE" });

export const sendsUnknownEvent = () => {
  // @ts-expect-error -- "FLIP" is not a ToggleEvent
  machine.send({ type: "FLIP" });
};

const name: ToggleState["name"] = machine.state.name;
console.log(name);
`;
