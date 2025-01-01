import type { MachineEvent } from "./MachineEvent";
import type { MachineInstance } from "./MachineInstance";
import type { MachineState } from "./MachineState";
import { type MachineDefinitionConfig, defineMachine } from "./defineMachine";

/**
 * Creates a machine instance. Use this for singleton machines.
 * @param definitionConfig describes the machine prototype; it's states and how it responds to events
 * @returns the machine definition, which can be used to create new machine instances
 */
export const createMachine = <StateType extends MachineState<string>, EventType extends MachineEvent<string>>(
  definitionConfig: MachineDefinitionConfig<StateType, EventType>,
): MachineInstance<StateType, EventType> => {
  return defineMachine(definitionConfig).newInstance();
};
