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
  subscribe(callback: (state: StateType, event: EventType | undefined) => void): Unsubscribe;
}

export type Unsubscribe = () => void;
