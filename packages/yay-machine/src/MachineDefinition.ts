import type { MachineEvent } from "./MachineEvent";
import type { MachineInstance, MachineInstanceConfig } from "./MachineInstance";
import type { MachineState } from "./MachineState";

export interface MachineInstanceProvider<
  StateType extends MachineState,
  EventType extends MachineEvent,
> {
  /**
   * Create a new machine instance
   * @param config optional configuration for the new machine instance
   * @returns a new machine instance
   */
  newInstance(
    config?: MachineInstanceConfig<StateType>,
  ): MachineInstance<StateType, EventType>;
}

// export type MachineStateFactories<StateType extends MachineState> = {
//   [Name in StateType["name"]]: StateData<StateType, Name> extends never
//     ? () => ExtractState<StateType, Name>
//     : (data: StateData<StateType, Name>) => ExtractState<StateType, Name>;
// };

// export type MachineEventFactories<EventType extends MachineEvent> = {
//   [Type in EventType["type"]]: EventPayload<EventType, Type> extends never
//     ? () => ExtractEvent<EventType, Type>
//     : (payload: EventPayload<EventType, Type>) => ExtractEvent<EventType, Type>;
// };

/**
 * The result of calling `defineMachine`.
 * A factory for creating new machine instances.
 */
export interface MachineDefinition<
  StateType extends MachineState,
  EventType extends MachineEvent,
> extends MachineInstanceProvider<StateType, EventType> {} //  & MachineStateFactories<StateType> & MachineEventFactories<EventType>;

/**
 * Infer type of MachineInstance for a machine definition
 */
// biome-ignore lint/suspicious/noExplicitAny: must be any
export type MachineInstanceOf<Definition extends MachineDefinition<any, any>> =
  Definition extends MachineDefinition<infer StateType, infer EventType>
    ? MachineInstance<StateType, EventType>
    : never;
