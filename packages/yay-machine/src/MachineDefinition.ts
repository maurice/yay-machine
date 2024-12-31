import type { EventPayload, ExtractEvent, MachineEvent } from "./MachineEvent";
import type { MachineInstance, MachineInstanceConfig } from "./MachineInstance";
import type { ExtractState, MachineState, StateContext } from "./MachineState";

export interface MachineInstanceProvider<
  StateType extends MachineState<string>,
  EventType extends MachineEvent<string>,
> {
  newInstance(config?: MachineInstanceConfig<StateType>): MachineInstance<StateType, EventType>;
}

export type MachineStateFactories<StateType extends MachineState<string>> = {
  [Name in StateType["name"]]: StateContext<StateType, Name> extends never
    ? () => ExtractState<StateType, Name>
    : (context: StateContext<StateType, Name>) => ExtractState<StateType, Name>;
};

export type MachineEventFactories<EventType extends MachineEvent<string>> = {
  [Type in EventType["type"]]: EventPayload<EventType, Type> extends never
    ? () => ExtractEvent<EventType, Type>
    : (payload: EventPayload<EventType, Type>) => ExtractEvent<EventType, Type>;
};

export type MachineDefinition<
  StateType extends MachineState<string>,
  EventType extends MachineEvent<string>,
> = MachineInstanceProvider<StateType, EventType> & MachineStateFactories<StateType> & MachineEventFactories<EventType>;
