import type { MachineEvent } from "./MachineEvent";
import type { MachineState } from "./MachineState";

export interface MachineInstanceConfig<StateType extends MachineState> {
  readonly initialState?: StateType;
}

export interface MachineInstance<StateType extends MachineState, EventType extends MachineEvent> {
  readonly state: StateType;
  start(): void;
  stop(): void;
  send(event: EventType): void;
  subscribe(subscriber: Subscriber<StateType, EventType>): Unsubscribe;
}

export type Subscriber<StateType extends MachineState, EventType extends MachineEvent> = (
  state: StateType,
  event: EventType | undefined,
) => void;

export type Unsubscribe = () => void;
