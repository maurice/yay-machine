import type { MachineEvent } from "./MachineEvent";
import type { MachineState } from "./MachineState";

export interface MachineInstanceConfig<StateType extends MachineState<string>> {
  readonly initialState?: StateType;
}

export interface MachineInstance<StateType extends MachineState<string>, EventType extends MachineEvent<string>> {
  readonly state: StateType;
  start(): void;
  stop(): void;
  send(event: EventType): void;
  subscribe(subscriber: Subscriber<StateType, EventType>): Unsubscribe;
}

export type Subscriber<StateType extends MachineState<string>, EventType extends MachineEvent<string>> = (
  state: StateType,
  event: EventType | undefined,
) => void;

export type Unsubscribe = () => void;
