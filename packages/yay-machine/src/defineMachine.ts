import type { MachineDefinition } from "./MachineDefinition";
import type { MachineEvent, ExtractEvent } from "./MachineEvent";
import type { MachineInstance, Unsubscribe } from "./MachineInstance";
import type { MachineState, ExtractState, StateContext } from "./MachineState";
import type { OneOrMore } from "./OneOrMore";

export interface MachineDefinitionConfig<
  StateType extends MachineState<string>,
  EventType extends MachineEvent<string>,
> {
  readonly initialState: StateType;
  readonly states: Partial<StatesConfig<StateType, EventType>>;
  readonly onStart?: EffectFunction<StateType, EventType, StateType>;
  readonly onStop?: EffectFunction<StateType, EventType, StateType>;
  readonly on?: Partial<TransitionsConfig<StateType, EventType, StateType>>;
}

export type StatesConfig<StateType extends MachineState<string>, EventType extends MachineEvent<string>> = {
  readonly [Name in StateType["name"]]: StateConfig<StateType, EventType, ExtractState<StateType, Name>>;
};

export type StateConfig<
  StateType extends MachineState<string>,
  EventType extends MachineEvent<string>,
  CurrentState extends StateType,
> = {
  readonly on?: Partial<TransitionsConfig<StateType, EventType, CurrentState>>;
  readonly always?: OneOrMore<TransitionConfig<StateType, EventType, CurrentState, undefined>>;
  readonly onEntry?: EffectFunction<StateType, EventType, CurrentState>;
  readonly onExit?: EffectFunction<StateType, EventType, CurrentState>;
};

export type TransitionsConfig<
  StateType extends MachineState<string>,
  EventType extends MachineEvent<string>,
  CurrentState extends StateType,
> = {
  readonly [Type in EventType["type"]]?: OneOrMore<
    TransitionConfig<StateType, EventType, CurrentState, ExtractEvent<EventType, Type>>
  >;
};

export type TransitionConfig<
  StateType extends MachineState<string>,
  EventType extends MachineEvent<string>,
  CurrentState extends StateType,
  CurrentEvent extends EventType | undefined,
> = {
  readonly [Name in StateType["name"]]: keyof Omit<ExtractState<StateType, Name>, "name"> extends never
    ? Transition<StateType, EventType, Name, CurrentState, CurrentEvent>
    : Transition<StateType, EventType, Name, CurrentState, CurrentEvent> &
        TransitionWith<StateType, EventType, CurrentState, CurrentEvent, ExtractState<StateType, Name>>;
}[StateType["name"]];

export type Transition<
  StateType extends MachineState<string>,
  EventType extends MachineEvent<string>,
  Name extends StateType["name"],
  CurrentState extends StateType,
  CurrentEvent extends EventType | undefined,
> = {
  readonly to: Name;
  readonly when?: (currentState: CurrentState, currentEvent: CurrentEvent) => boolean;
  readonly onTransition?: EffectFunction<StateType, EventType, CurrentState>;
};

export type TransitionWith<
  StateType extends MachineState<string>,
  EventType extends MachineEvent<string>,
  CurrentState extends StateType,
  CurrentEvent extends EventType | undefined,
  NextState extends StateType,
> = {
  readonly with: WithFunction<StateType, EventType, CurrentState, CurrentEvent, NextState>;
};

export type WithFunction<
  StateType extends MachineState<string>,
  EventType extends MachineEvent<string>,
  CurrentState extends StateType,
  CurrentEvent extends EventType | undefined,
  NextState extends StateType,
> = (currentState: CurrentState, event: CurrentEvent) => StateContext<NextState, NextState["name"]>;

export type EffectFunction<
  StateType extends MachineState<string>,
  EventType extends MachineEvent<string>,
  CurrentState extends StateType,
> = (
  machine: Omit<MachineInstance<StateType, EventType>, "currentState"> & { readonly currentState: CurrentState },
  // biome-ignore lint/suspicious/noConfusingVoidType: adding void to union as we don't want to force users to explicity return
) => Unsubscribe | undefined | null | void;

export const defineMachine = <StateType extends MachineState<string>, EventType extends MachineEvent<string>>(
  config: MachineDefinitionConfig<StateType, EventType>,
): MachineDefinition<StateType, EventType> => {
  // @ts-expect-error
  return {
    newInstance() {
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      return {} as any;
    },
  };
};
