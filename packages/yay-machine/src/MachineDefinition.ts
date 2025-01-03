import type { MachineEvent } from "./MachineEvent";
import type { MachineInstance, MachineInstanceConfig } from "./MachineInstance";
import type { MachineState } from "./MachineState";

export interface MachineInstanceProvider<StateType extends MachineState, EventType extends MachineEvent> {
  newInstance(config?: MachineInstanceConfig<StateType>): MachineInstance<StateType, EventType>;
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

export type MachineDefinition<StateType extends MachineState, EventType extends MachineEvent> = MachineInstanceProvider<
  StateType,
  EventType
>; //  & MachineStateFactories<StateType> & MachineEventFactories<EventType>;
