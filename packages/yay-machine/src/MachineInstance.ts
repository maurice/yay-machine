import type { MachineEvent } from "./MachineEvent";
import type { MachineState } from "./MachineState";

export interface MachineInstanceConfig<StateType extends MachineState> {
  readonly initialState?: StateType;
}

export interface MachineInstance<StateType extends MachineState, EventType extends MachineEvent> {
  readonly state: StateType;
  start(): this;
  stop(): void;
  send(event: EventType): void;
  subscribe(subscriber: Subscriber<StateType, EventType>): Unsubscribe;
}

export type Subscriber<StateType extends MachineState, EventType extends MachineEvent> = (
  params: SubscriberParams<StateType, EventType>,
) => void;

export interface SubscriberParams<StateType extends MachineState, EventType extends MachineEvent> {
  readonly state: StateType;
  readonly event: EventType | undefined;
}

export type Unsubscribe = () => void;
