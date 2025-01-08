import type { MachineDefinitionConfig } from "./MachineDefinitionConfig";
import type { MachineEvent } from "./MachineEvent";
import type { MachineInstance } from "./MachineInstance";
import type { MachineState } from "./MachineState";
import { defineMachine } from "./defineMachine";

/**
 * Creates a machine instance.
 * Wrapper around `defineMachine(...).newInstance()`
 * @param definitionConfig describes the machine prototype; it's states and how it responds to events
 * @returns the machine definition, which can be used to create new machine instances
 */
export const createMachine = <StateType extends MachineState, EventType extends MachineEvent>(
  definitionConfig: MachineDefinitionConfig<StateType, EventType>,
): MachineInstance<StateType, EventType> => {
  return defineMachine(definitionConfig).newInstance();
};
