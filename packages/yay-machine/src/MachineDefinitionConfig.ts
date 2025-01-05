import type { ExtractEvent, MachineEvent } from "./MachineEvent";
import type { MachineInstance, Unsubscribe } from "./MachineInstance";
import type { ExtractState, IsStateDataHomogenous, MachineState, StateData } from "./MachineState";
import type { OneOrMore } from "./OneOrMore";

export type MachineDefinitionConfig<
  StateType extends MachineState,
  EventType extends MachineEvent,
> = WithHomogenousStateMachineDefinitionConfig<
  {
    readonly initialState: StateType;
    readonly states: StatesConfig<StateType, EventType>;
    readonly onStart?: EffectFunction<StateType, EventType, StateType>;
    readonly onStop?: EffectFunction<StateType, EventType, StateType>;
    readonly on?: AnyStateTransitionsConfig<StateType, EventType, StateType>;
  },
  StateType
>;

export type WithHomogenousStateMachineDefinitionConfig<
  Type,
  StateType extends MachineState,
> = IsStateDataHomogenous<StateType> extends true ? Type & HomogenousStateMachineDefinitionConfig : Type;

/**
 * For machines whose states have the same data structure
 */
export type HomogenousStateMachineDefinitionConfig = {
  /**
   * If `true`, data is automatically copied between states when transitioning, and the
   * transition does not provide its own `data()` callback implementation.
   * This avoids boilerplate `data()` callbacks config, like `{ to: 'foo', data: ({ state }) => state }`.
   * @property {boolean} [enableCopyDataOnTransition] automatically copy data between states when transitioning?
   * @default false
   */
  readonly enableCopyDataOnTransition?: boolean;
};

export type StatesConfig<StateType extends MachineState, EventType extends MachineEvent> = {
  readonly [Name in StateType["name"]]?: StateConfig<StateType, EventType, ExtractState<StateType, Name>>;
};

export type StateConfig<
  StateType extends MachineState,
  EventType extends MachineEvent,
  CurrentState extends StateType,
> = {
  readonly on?: TransitionsConfig<StateType, EventType, CurrentState>;
  readonly always?: OneOrMore<TransitionConfig<StateType, EventType, CurrentState, undefined>>;
  readonly onEnter?: EffectFunction<StateType, EventType, CurrentState>;
  readonly onExit?: EffectFunction<StateType, EventType, CurrentState>;
};

export type TransitionsConfig<
  StateType extends MachineState,
  EventType extends MachineEvent,
  CurrentState extends StateType,
> = {
  readonly [Type in EventType["type"]]?: OneOrMore<
    TransitionConfig<StateType, EventType, CurrentState, ExtractEvent<EventType, Type>>
  >;
};

export type TransitionConfig<
  StateType extends MachineState,
  EventType extends MachineEvent,
  CurrentState extends StateType,
  CurrentEvent extends EventType | undefined,
> = {
  readonly [Name in StateType["name"]]: keyof Omit<ExtractState<StateType, Name>, "name"> extends never
    ? Transition<StateType, EventType, CurrentState, CurrentEvent, ExtractState<StateType, Name>>
    : TransitionWithData<StateType, EventType, CurrentState, CurrentEvent, ExtractState<StateType, Name>>;
}[StateType["name"]];

export interface Transition<
  StateType extends MachineState,
  EventType extends MachineEvent,
  CurrentState extends StateType,
  CurrentEvent extends EventType | undefined,
  NextState extends StateType,
> {
  readonly to: NextState["name"];
  readonly when?: (params: CallbackParams<CurrentState, CurrentEvent>) => boolean;
  readonly onTransition?: EffectFunction<StateType, EventType, CurrentState, CurrentEvent, NextState>;
}

export type TransitionWithData<
  StateType extends MachineState,
  EventType extends MachineEvent,
  CurrentState extends StateType,
  CurrentEvent extends EventType | undefined,
  NextState extends StateType,
> = Transition<StateType, EventType, CurrentState, CurrentEvent, NextState> &
  (IsStateDataHomogenous<StateType> extends true
    ? Partial<TransitionData<StateType, EventType, CurrentState, CurrentEvent, NextState>>
    : TransitionData<StateType, EventType, CurrentState, CurrentEvent, NextState>);

export type TransitionData<
  StateType extends MachineState,
  EventType extends MachineEvent,
  CurrentState extends StateType,
  CurrentEvent extends EventType | undefined,
  NextState extends StateType,
> = {
  readonly data: DataFunction<StateType, EventType, CurrentState, CurrentEvent, NextState>;
};

export type DataFunction<
  StateType extends MachineState,
  EventType extends MachineEvent,
  CurrentState extends StateType,
  CurrentEvent extends EventType | undefined,
  NextState extends StateType,
> = (params: CallbackParams<CurrentState, CurrentEvent>) => StateData<NextState, NextState["name"]>;

export type CallbackParams<
  CurrentState extends MachineState,
  CurrentEvent extends MachineEvent | undefined,
> = WithEvent<
  {
    readonly state: CurrentState;
  },
  CurrentEvent
>;

export type EffectFunction<
  StateType extends MachineState,
  EventType extends MachineEvent,
  CurrentState extends StateType,
  CurrentEvent extends EventType | undefined = undefined,
  NextState extends StateType | undefined = undefined,
> = (
  params: EffectParams<StateType, EventType, CurrentState, CurrentEvent, NextState>,
  // biome-ignore lint/suspicious/noConfusingVoidType: adding void to union as we don't want to force users to explicity return
) => Unsubscribe | undefined | null | void;

export type EffectParams<
  StateType extends MachineState,
  EventType extends MachineEvent,
  CurrentState extends StateType,
  CurrentEvent extends EventType | undefined = undefined,
  NextState extends StateType | undefined = undefined,
> = WithNextState<
  WithEvent<
    Pick<MachineInstance<StateType, EventType>, "send"> & {
      readonly state: CurrentState;
    },
    CurrentEvent
  >,
  NextState
>;

export type WithNextState<Type, NextState extends MachineState | undefined = undefined> = NextState extends undefined
  ? Type
  : Type & { readonly next: NextState };

export type WithEvent<Type, EventType extends MachineEvent | undefined> = EventType extends undefined
  ? Type
  : Type & { readonly event: EventType };

export type AnyStateTransitionsConfig<
  StateType extends MachineState,
  EventType extends MachineEvent,
  CurrentState extends StateType,
> = {
  readonly [Type in EventType["type"]]?: OneOrMore<
    AnyStateTransitionConfig<StateType, EventType, CurrentState, ExtractEvent<EventType, Type>>
  >;
};

export type AnyStateTransitionConfig<
  StateType extends MachineState,
  EventType extends MachineEvent,
  CurrentState extends StateType,
  CurrentEvent extends EventType | undefined,
> = {
  readonly [Name in StateType["name"]]: keyof Omit<ExtractState<StateType, Name>, "name"> extends never
    ? AnyStateTransition<StateType, EventType, CurrentState, CurrentEvent, ExtractState<StateType, Name>>
    : AnyStateTransitionWith<StateType, EventType, CurrentState, CurrentEvent, ExtractState<StateType, Name>>;
}[StateType["name"]];

export interface AnyStateTransition<
  StateType extends MachineState,
  EventType extends MachineEvent,
  CurrentState extends StateType,
  CurrentEvent extends EventType | undefined,
  NextState extends StateType,
> {
  readonly to?: NextState["name"]; // current state if not specified
  readonly when?: (params: CallbackParams<CurrentState, CurrentEvent>) => boolean;
  readonly onTransition?: EffectFunction<StateType, EventType, CurrentState, CurrentEvent, NextState>;
}

export type AnyStateTransitionWith<
  StateType extends MachineState,
  EventType extends MachineEvent,
  CurrentState extends StateType,
  CurrentEvent extends EventType | undefined,
  NextState extends StateType,
> = AnyStateTransition<StateType, EventType, CurrentState, CurrentEvent, NextState> &
  (IsStateDataHomogenous<StateType> extends true
    ? Partial<TransitionData<StateType, EventType, CurrentState, CurrentEvent, NextState>>
    : TransitionData<StateType, EventType, CurrentState, CurrentEvent, NextState>);
