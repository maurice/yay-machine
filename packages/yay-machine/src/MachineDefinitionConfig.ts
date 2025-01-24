import type { ExtractEvent, MachineEvent } from "./MachineEvent";
import type { Unsubscribe } from "./MachineInstance";
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
  CopyDataOnTransition extends boolean,
> {
  /**
   * Default initial state of each new machine.
   * Can be overridden by optional `MachineInstanceConfig` passed to
   * `MachineDefinition.newInstance()`
   */
  readonly initialState: StateType;

  /**
   * The machine states configuration.
   * Defines state-specific event- and/or immediate-transitions
   */
  readonly states?: StatesConfig<StateType, EventType, CopyDataOnTransition>;

  /**
   * Optional side-effect, run when a machine instance is started.
   * Should return a tear-down function so any resources can be freed when
   * the machine is stopped.
   */
  readonly onStart?: MachineOnStartSideEffectFunction<StateType, EventType>;

  /**
   * Optional side-effect, run when a machine instance is stopped.
   * May return a tear-down function so any resources can be freed when
   * the machine is stopped.
   */
  readonly onStop?: MachineOnStopSideEffectFunction<StateType>;

  /**
   * Any states configuration.
   * Defines state-agnostic event-transitions
   */
  readonly on?: AnyStateTransitionsConfig<StateType, EventType, StateType>;
}

export type MachineOnStartSideEffectFunction<StateType extends MachineState, EventType extends MachineEvent> = (
  param: MachineOnStartSideEffectParam<StateType, EventType>,
) => EffectReturnValue;

export type MachineOnStartSideEffectParam<StateType extends MachineState, EventType extends MachineEvent> = {
  readonly state: StateType;
  readonly send: SendFunction<EventType>;
};

export type MachineOnStopSideEffectFunction<StateType extends MachineState> = (
  param: MachineOnStopSideEffectParam<StateType>,
) => EffectReturnValue;

export type MachineOnStopSideEffectParam<StateType extends MachineState> = {
  readonly state: StateType;
};

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
  CopyDataOnTransition extends boolean,
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
  CopyDataOnTransition extends boolean,
> = {
  /**
   * Define a map of transitions keyed by event `type`
   */
  readonly on?: StateTransitionsConfig<StateType, EventType, CurrentState, CopyDataOnTransition>;

  /**
   * Define one or more immediate transitions, that are always attempted when entering the state
   */
  readonly always?: OneOrMore<
    TransitionConfig<StateType, EventType, CurrentState, undefined, CopyDataOnTransition, true>
  >;

  /**
   * Optional side-effect, run when the state is entered.
   * Should return a tear-down function so any resources can be freed when
   * the state is exited.
   */
  readonly onEnter?: StateLifecycleSideEffectFunction<CurrentState, EventType>;

  /**
   * Optional side-effect, run when the state is exited.
   * May return a tear-down function so any resources can be freed when
   * the state is exited.
   */
  readonly onExit?: StateLifecycleSideEffectFunction<CurrentState, EventType>;
};

export type StateLifecycleSideEffectFunction<CurrentState extends MachineState, EventType extends MachineEvent> = (
  param: StateLifecycleSideEffectParam<CurrentState, EventType>,
) => EffectReturnValue;

export type StateLifecycleSideEffectParam<CurrentState extends MachineState, EventType extends MachineEvent> = {
  readonly state: CurrentState;
  readonly event: EventType | undefined;
  readonly send: SendFunction<EventType>;
};

export type StateTransitionsConfig<
  StateType extends MachineState,
  EventType extends MachineEvent,
  CurrentState extends StateType,
  CopyDataOnTransition extends boolean,
> = {
  readonly [Type in EventType["type"]]?: OneOrMore<
    TransitionConfig<StateType, EventType, CurrentState, ExtractEvent<EventType, Type>, CopyDataOnTransition, false>
  >;
};

export type TransitionConfig<
  StateType extends MachineState,
  EventType extends MachineEvent,
  CurrentState extends StateType,
  CurrentEvent extends EventType | undefined,
  CopyDataOnTransition extends boolean,
  IsImmediateTransition extends boolean,
> = {
  readonly [Name in StateType["name"]]: Transition<
    StateType,
    EventType,
    CurrentState,
    CurrentEvent,
    ExtractState<StateType, Name>,
    CopyDataOnTransition,
    IsImmediateTransition
  >;
}[StateType["name"]];

export type Transition<
  StateType extends MachineState,
  EventType extends MachineEvent,
  CurrentState extends StateType,
  CurrentEvent extends EventType | undefined,
  NextState extends StateType,
  CopyDataOnTransition extends boolean,
  IsImmediateTransition extends boolean,
> = keyof Omit<NextState, "name"> extends never
  ? BasicTransition<StateType, EventType, CurrentState, CurrentEvent, NextState>
  : OtherTransition<
      StateType,
      EventType,
      CurrentState,
      CurrentEvent,
      NextState,
      CopyDataOnTransition,
      IsImmediateTransition
    >;

/**
 * Defines a potential transition from the current state to the next state
 */
export interface BasicTransition<
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
   * @param param an object containing the current state and event
   * @returns true if the transition should be taken
   */
  readonly when?: (param: { readonly state: CurrentState; readonly event: CurrentEvent }) => boolean;

  /**
   * Optional side-effect, run when the transition is taken.
   * May return a tear-down function so any resources can be freed when
   * the state is exited.
   */
  readonly onTransition?: OnTransitionSideEffectFunction<StateType, EventType, CurrentState, CurrentEvent, NextState>;
}

export type OnTransitionSideEffectFunction<
  StateType extends MachineState,
  EventType extends MachineEvent,
  CurrentState extends StateType,
  CurrentEvent extends EventType | undefined,
  NextState extends StateType,
> = (
  param: OnTransitionSideEffectParam<StateType, CurrentState, CurrentEvent, NextState, EventType>,
) => EffectReturnValue;

type OnTransitionSideEffectParam<
  StateType extends MachineState,
  CurrentState extends StateType,
  CurrentEvent extends EventType | undefined,
  NextState extends StateType,
  EventType extends MachineEvent,
> = {
  readonly state: CurrentState;
  readonly event: CurrentEvent;
  readonly next: NextState;
  readonly send: SendFunction<EventType>;
};

export type OtherTransition<
  StateType extends MachineState,
  EventType extends MachineEvent,
  CurrentState extends StateType,
  CurrentEvent extends EventType | undefined,
  NextState extends StateType,
  CopyDataOnTransition extends boolean,
  IsImmediateTransition extends boolean,
> = BasicTransition<StateType, EventType, CurrentState, CurrentEvent, NextState> &
  (NextState["name"] extends CurrentState["name"]
    ? IsImmediateTransition extends false
      ?
          | ReenterTransition<false>
          | DataTransition<StateType, EventType, CurrentState, CurrentEvent, NextState, CopyDataOnTransition>
      : DataTransition<StateType, EventType, CurrentState, CurrentEvent, NextState, CopyDataOnTransition>
    : DataTransition<StateType, EventType, CurrentState, CurrentEvent, NextState, CopyDataOnTransition>);

export type DataTransition<
  StateType extends MachineState,
  EventType extends MachineEvent,
  CurrentState extends StateType,
  CurrentEvent extends EventType | undefined,
  NextState extends StateType,
  CopyDataOnTransition extends boolean,
> = CopyDataOnTransition extends true
  ? Partial<TransitionData<StateType, EventType, CurrentState, CurrentEvent, NextState>>
  : TransitionData<StateType, EventType, CurrentState, CurrentEvent, NextState>;

export interface ReenterTransition<Reenter extends boolean> {
  /**
   * If false, the transition does not re-enter the current state, so side-effects are not stopped/re-started
   * @default true
   */
  readonly reenter: Reenter;
}

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
  readonly data: (param: { readonly state: CurrentState; readonly event: CurrentEvent }) => StateData<
    NextState,
    NextState["name"]
  >;
};

export type SendFunction<EventType extends MachineEvent> = (event: EventType) => void;

// biome-ignore lint/suspicious/noConfusingVoidType: adding void to union as we don't want to force users to explicity return
export type EffectReturnValue = Unsubscribe | undefined | null | void;

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
   * @param param the current state and event
   * @returns true if the transition should be taken
   */
  readonly when?: (param: { readonly state: CurrentState; readonly event: CurrentEvent }) => boolean;

  /**
   * Optional side-effect, run when the transition is taken.
   * May return a tear-down function so any resources can be freed when
   * the state is exited.
   */
  readonly onTransition?: (param: {
    readonly state: CurrentState;
    readonly event: CurrentEvent;
    readonly send: SendFunction<EventType>;
  }) => EffectReturnValue;
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
