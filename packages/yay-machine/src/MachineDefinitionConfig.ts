import type { ExtractEvent, MachineEvent } from "./MachineEvent";
import type { MachineInstance, Unsubscribe } from "./MachineInstance";
import type { ExtractState, IsStateDataHomogenous, MachineState, StateData } from "./MachineState";
import type { OneOrMore } from "./OneOrMore";

/**
 * Machine definition configuration - the blueprint for the machine instances.
 */
export type MachineDefinitionConfig<
  StateType extends MachineState,
  EventType extends MachineEvent,
> = IsStateDataHomogenous<StateType> extends true
  ?
      | HomogenousStateMachineDefinitionConfigCopyDataOnTransitionTrue<StateType, EventType>
      | HomogenousStateMachineDefinitionConfigCopyDataOnTransitionFalse<StateType, EventType>
  : HeterogenousStateMachineDefinitionConfig<StateType, EventType, false>;

export interface HeterogenousStateMachineDefinitionConfig<
  StateType extends MachineState,
  EventType extends MachineEvent,
  CopyDataOnTransition extends boolean | undefined,
> {
  /**
   * Default initial state of each new machine.
   * Can be overriden by optional `MachineInstanceConfig` passed to
   * `MachineDefinition.newInstance()`
   */
  readonly initialState: StateType;

  /**
   * The machine states configuration.
   * Defines state-specific event- and/or immediate-transitions
   */
  readonly states: StatesConfig<StateType, EventType, CopyDataOnTransition>;

  /**
   * Optional side-effect, run when a machine instance is started.
   * Should return a tear-down function so any resources can be freed when
   * the machine is stopped.
   */
  readonly onStart?: EffectFunction<StateType, EventType, StateType>;

  /**
   * Optional side-effect, run when a machine instance is stopped.
   * May return a tear-down function so any resources can be freed when
   * the machine is stopped.
   */
  readonly onStop?: EffectFunction<StateType, EventType, StateType>;

  /**
   * Any states configuration.
   * Defines state-agnostic event-transitions
   */
  readonly on?: AnyStateTransitionsConfig<StateType, EventType, StateType>;
}

/**
 * For machines whose states have the same data structure
 */
export interface HomogenousStateMachineDefinitionConfigCopyDataOnTransitionTrue<
  StateType extends MachineState,
  EventType extends MachineEvent,
> extends HeterogenousStateMachineDefinitionConfig<StateType, EventType, true> {
  /**
   * If `true`, data is automatically copied between states when transitioning, and the
   * transition does not provide its own `data()` callback implementation.
   * This avoids boilerplate `data()` callbacks config, like `{ to: 'foo', data: ({ state }) => state }`.
   * @default false
   */
  readonly enableCopyDataOnTransition: true;
}

/**
 * For machines whose states have the same data structure
 */
export interface HomogenousStateMachineDefinitionConfigCopyDataOnTransitionFalse<
  StateType extends MachineState,
  EventType extends MachineEvent,
> extends HeterogenousStateMachineDefinitionConfig<StateType, EventType, false> {
  /**
   * If `true`, data is automatically copied between states when transitioning, and the
   * transition does not provide its own `data()` callback implementation.
   * This avoids boilerplate `data()` callbacks config, like `{ to: 'foo', data: ({ state }) => state }`.
   * @default false
   */
  readonly enableCopyDataOnTransition?: false;
}

export type StatesConfig<
  StateType extends MachineState,
  EventType extends MachineEvent,
  CopyDataOnTransition extends boolean | undefined,
> = {
  readonly [Name in StateType["name"]]?: StateConfig<
    StateType,
    EventType,
    ExtractState<StateType, Name>,
    CopyDataOnTransition
  >;
};

/**
 * Configuration for a machine-state:
 * * event- and immediate-transitions
 * * side-effects
 */
export type StateConfig<
  StateType extends MachineState,
  EventType extends MachineEvent,
  CurrentState extends StateType,
  CopyDataOnTransition extends boolean | undefined,
> = {
  /**
   * Define a map of transitions keyed by event `type`
   */
  readonly on?: TransitionsConfig<StateType, EventType, CurrentState, CopyDataOnTransition>;

  /**
   * Define one or more immediate transitions, that are always attempted when entering the state
   */
  readonly always?: OneOrMore<TransitionConfig<StateType, EventType, CurrentState, undefined, CopyDataOnTransition>>;

  /**
   * Optional side-effect, run when the state is entered.
   * Should return a tear-down function so any resources can be freed when
   * the state is exited.
   */
  readonly onEnter?: EffectFunction<StateType, EventType, CurrentState>;

  /**
   * Optional side-effect, run when the state is exited.
   * May return a tear-down function so any resources can be freed when
   * the state is exited.
   */
  readonly onExit?: EffectFunction<StateType, EventType, CurrentState>;
};

export type TransitionsConfig<
  StateType extends MachineState,
  EventType extends MachineEvent,
  CurrentState extends StateType,
  CopyDataOnTransition extends boolean | undefined,
> = {
  readonly [Type in EventType["type"]]?: OneOrMore<
    TransitionConfig<StateType, EventType, CurrentState, ExtractEvent<EventType, Type>, CopyDataOnTransition>
  >;
};

export type TransitionConfig<
  StateType extends MachineState,
  EventType extends MachineEvent,
  CurrentState extends StateType,
  CurrentEvent extends EventType | undefined,
  CopyDataOnTransition extends boolean | undefined,
> = {
  readonly [Name in StateType["name"]]: keyof Omit<ExtractState<StateType, Name>, "name"> extends never
    ? Transition<StateType, EventType, CurrentState, CurrentEvent, ExtractState<StateType, Name>>
    : TransitionWithData<
        StateType,
        EventType,
        CurrentState,
        CurrentEvent,
        ExtractState<StateType, Name>,
        CopyDataOnTransition
      >;
}[StateType["name"]];

/**
 * Defines a potential transition from the current state to the next state
 */
export interface Transition<
  StateType extends MachineState,
  EventType extends MachineEvent,
  CurrentState extends StateType,
  CurrentEvent extends EventType | undefined,
  NextState extends StateType,
> {
  /**
   * The name of the next state
   */
  readonly to: NextState["name"];

  /**
   * Optional predicate function if the transition is conditional
   * @param params the current state and event
   * @returns true if the transition should be taken
   */
  readonly when?: (params: CallbackParams<CurrentState, CurrentEvent>) => boolean;

  /**
   * Optional side-effect, run when the transition is taken.
   * May return a tear-down function so any resources can be freed when
   * the state is exited.
   */
  readonly onTransition?: EffectFunction<StateType, EventType, CurrentState, CurrentEvent, NextState>;
}

export type TransitionWithData<
  StateType extends MachineState,
  EventType extends MachineEvent,
  CurrentState extends StateType,
  CurrentEvent extends EventType | undefined,
  NextState extends StateType,
  CopyDataOnTransition extends boolean | undefined,
> = Transition<StateType, EventType, CurrentState, CurrentEvent, NextState> &
  (CopyDataOnTransition extends true
    ? Partial<TransitionData<StateType, EventType, CurrentState, CurrentEvent, NextState>>
    : TransitionData<StateType, EventType, CurrentState, CurrentEvent, NextState>);

export type TransitionData<
  StateType extends MachineState,
  EventType extends MachineEvent,
  CurrentState extends StateType,
  CurrentEvent extends EventType | undefined,
  NextState extends StateType,
> = {
  /**
   * Generate state-data for the next state,
   * usually by combining existing state-data with the event-payload
   */
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
  /**
   * The name of the next state
   */
  readonly to?: NextState["name"]; // current state if not specified

  /**
   * Optional predicate function if the transition is conditional
   * @param params the current state and event
   * @returns true if the transition should be taken
   */
  readonly when?: (params: CallbackParams<CurrentState, CurrentEvent>) => boolean;

  /**
   * Optional side-effect, run when the transition is taken.
   * May return a tear-down function so any resources can be freed when
   * the state is exited.
   */
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
