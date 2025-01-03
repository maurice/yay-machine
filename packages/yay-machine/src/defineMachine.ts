import type { MachineDefinition } from "./MachineDefinition";
import type { ExtractEvent, MachineEvent } from "./MachineEvent";
import type { MachineInstance, Unsubscribe } from "./MachineInstance";
import type { ExtractState, IsStateDataHomogenous, MachineState, StateData } from "./MachineState";
import type { OneOrMore } from "./OneOrMore";

export type MachineDefinitionConfig<
  StateType extends MachineState<string>,
  EventType extends MachineEvent<string>,
> = MaybeHomogenousStateMachineDefinitionConfig<StateType> & {
  readonly initialState: StateType;
  readonly states: StatesConfig<StateType, EventType>;
  readonly onStart?: EffectFunction<StateType, EventType, StateType>;
  readonly onStop?: EffectFunction<StateType, EventType, StateType>;
  readonly on?: AnyStateTransitionsConfig<StateType, EventType, StateType>;
};

export type MaybeHomogenousStateMachineDefinitionConfig<StateType extends MachineState<string>> =
  // biome-ignore lint/complexity/noBannedTypes: seems to be the only way to get it working :(
  IsStateDataHomogenous<StateType> extends true ? HomogenousStateMachineDefinitionConfig : {};

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

export type StatesConfig<StateType extends MachineState<string>, EventType extends MachineEvent<string>> = {
  readonly [Name in StateType["name"]]?: StateConfig<StateType, EventType, ExtractState<StateType, Name>>;
};

export type StateConfig<
  StateType extends MachineState<string>,
  EventType extends MachineEvent<string>,
  CurrentState extends StateType,
> = {
  readonly on?: TransitionsConfig<StateType, EventType, CurrentState>;
  readonly always?: OneOrMore<TransitionConfig<StateType, EventType, CurrentState, undefined>>;
  readonly onEnter?: EffectFunction<StateType, EventType, CurrentState>;
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
    ? Transition<StateType, EventType, CurrentState, CurrentEvent, ExtractState<StateType, Name>>
    : TransitionWith<StateType, EventType, CurrentState, CurrentEvent, ExtractState<StateType, Name>>;
}[StateType["name"]];

export interface Transition<
  StateType extends MachineState<string>,
  EventType extends MachineEvent<string>,
  CurrentState extends StateType,
  CurrentEvent extends EventType | undefined,
  NextState extends StateType,
> {
  readonly to: NextState["name"];
  readonly when?: (params: CallbackParams<StateType, EventType, CurrentState, CurrentEvent>) => boolean;
  readonly onTransition?: TransitionEffectFunction<
    StateType,
    EventType,
    CurrentState,
    NonNullable<CurrentEvent>,
    NextState
  >;
}

export type TransitionWith<
  StateType extends MachineState<string>,
  EventType extends MachineEvent<string>,
  CurrentState extends StateType,
  CurrentEvent extends EventType | undefined,
  NextState extends StateType,
> = Transition<StateType, EventType, CurrentState, CurrentEvent, NextState> &
  (IsStateDataHomogenous<StateType> extends true
    ? Partial<TransitionData<StateType, EventType, CurrentState, CurrentEvent, NextState>>
    : TransitionData<StateType, EventType, CurrentState, CurrentEvent, NextState>);

export type TransitionData<
  StateType extends MachineState<string>,
  EventType extends MachineEvent<string>,
  CurrentState extends StateType,
  CurrentEvent extends EventType | undefined,
  NextState extends StateType,
> = {
  readonly data: DataFunction<StateType, EventType, CurrentState, CurrentEvent, NextState>;
};

export type DataFunction<
  StateType extends MachineState<string>,
  EventType extends MachineEvent<string>,
  CurrentState extends StateType,
  CurrentEvent extends EventType | undefined,
  NextState extends StateType,
> = (
  params: CallbackParams<StateType, EventType, CurrentState, CurrentEvent>,
) => StateData<NextState, NextState["name"]>;

export interface CallbackParams<
  StateType extends MachineState<string>,
  EventType extends MachineEvent<string>,
  CurrentState extends StateType,
  CurrentEvent extends EventType | undefined,
> {
  readonly state: CurrentState;
  readonly event: CurrentEvent;
}

export type EffectFunction<
  StateType extends MachineState<string>,
  EventType extends MachineEvent<string>,
  CurrentState extends StateType,
> = (
  params: EffectParams<StateType, EventType, CurrentState>,
  // biome-ignore lint/suspicious/noConfusingVoidType: adding void to union as we don't want to force users to explicity return
) => Unsubscribe | undefined | null | void;

export type EffectParams<
  StateType extends MachineState<string>,
  EventType extends MachineEvent<string>,
  CurrentState extends StateType,
> = Pick<MachineInstance<StateType, EventType>, "send"> & {
  readonly state: CurrentState;
};

export type TransitionEffectFunction<
  StateType extends MachineState<string>,
  EventType extends MachineEvent<string>,
  CurrentState extends StateType,
  CurrentEvent extends EventType,
  NextState extends StateType,
> = (
  params: TransitionEffectParams<StateType, EventType, CurrentState, CurrentEvent, NextState>,
  // biome-ignore lint/suspicious/noConfusingVoidType: adding void to union as we don't want to force users to explicity return
) => Unsubscribe | undefined | null | void;

export type TransitionEffectParams<
  StateType extends MachineState<string>,
  EventType extends MachineEvent<string>,
  CurrentState extends StateType,
  CurrentEvent extends EventType,
  NextState extends StateType,
> = EffectParams<StateType, EventType, CurrentState> & {
  readonly event: CurrentEvent;
  readonly next: NextState;
};

export type AnyStateTransitionsConfig<
  StateType extends MachineState<string>,
  EventType extends MachineEvent<string>,
  CurrentState extends StateType,
> = {
  readonly [Type in EventType["type"]]?: OneOrMore<
    AnyStateTransitionConfig<StateType, EventType, CurrentState, ExtractEvent<EventType, Type>>
  >;
};

export type AnyStateTransitionConfig<
  StateType extends MachineState<string>,
  EventType extends MachineEvent<string>,
  CurrentState extends StateType,
  CurrentEvent extends EventType | undefined,
> = {
  readonly [Name in StateType["name"]]: keyof Omit<ExtractState<StateType, Name>, "name"> extends never
    ? AnyStateTransition<StateType, EventType, CurrentState, CurrentEvent, ExtractState<StateType, Name>>
    : AnyStateTransitionWith<StateType, EventType, CurrentState, CurrentEvent, ExtractState<StateType, Name>>;
}[StateType["name"]];

export interface AnyStateTransition<
  StateType extends MachineState<string>,
  EventType extends MachineEvent<string>,
  CurrentState extends StateType,
  CurrentEvent extends EventType | undefined,
  NextState extends StateType,
> {
  readonly to?: NextState["name"]; // current state if not specified
  readonly when?: (params: CallbackParams<StateType, EventType, CurrentState, CurrentEvent>) => boolean;
  readonly onTransition?: TransitionEffectFunction<
    StateType,
    EventType,
    CurrentState,
    NonNullable<CurrentEvent>,
    NextState
  >;
}

export type AnyStateTransitionWith<
  StateType extends MachineState<string>,
  EventType extends MachineEvent<string>,
  CurrentState extends StateType,
  CurrentEvent extends EventType | undefined,
  NextState extends StateType,
> = AnyStateTransition<StateType, EventType, CurrentState, CurrentEvent, NextState> &
  (IsStateDataHomogenous<StateType> extends true
    ? Partial<TransitionData<StateType, EventType, CurrentState, CurrentEvent, NextState>>
    : TransitionData<StateType, EventType, CurrentState, CurrentEvent, NextState>);

/**
 * Defines a machine prototype. Use this when you intend to create multiple instances of the same machine.
 * @param definitionConfig describes the machine prototype; it's states and how it responds to events
 * @returns the machine definition, which can be used to create new machine instances
 */
export const defineMachine = <StateType extends MachineState<string>, EventType extends MachineEvent<string>>(
  definitionConfig: MachineDefinitionConfig<StateType, EventType>,
): MachineDefinition<StateType, EventType> => {
  type Cleanup = () => void;

  return {
    newInstance(instanceConfig) {
      const enableCopyDataOnTransition = (definitionConfig as HomogenousStateMachineDefinitionConfig)
        .enableCopyDataOnTransition;
      const initialState = instanceConfig?.initialState ?? definitionConfig.initialState;
      let currentState = initialState;

      // biome-ignore lint/suspicious/noExplicitAny: happens because we can't guarantee that `currentState` matches the generic `CurrentState` type
      const getEffectParams = () => ({ state: currentState as any, send: machine.send });

      let stateCleanup: Cleanup | undefined;

      const initState = () => {
        const { onEnter, onExit } = definitionConfig.states[currentState.name as StateType["name"]] || {};
        const cleanupEnter = onEnter?.(getEffectParams());
        stateCleanup = () => {
          cleanupEnter?.();
          onExit?.(getEffectParams())?.();
        };
      };

      const subscribers: Array<(state: StateType, event: EventType | undefined) => void> = [];

      const transitionTo = <
        CurrentState extends StateType,
        CurrentEvent extends EventType,
        NextState extends StateType,
      >(
        nextState: NextState,
        event: CurrentEvent | undefined,
        onTransition: TransitionEffectFunction<StateType, EventType, CurrentState, CurrentEvent, NextState> | undefined,
      ) => {
        if (stateCleanup) {
          stateCleanup();
          stateCleanup = undefined;
        }

        if (onTransition) {
          onTransition({
            state: currentState as CurrentState,
            event: event as CurrentEvent,
            next: nextState,
            send: machine.send,
          })?.();
        }

        currentState = nextState;
        initState();

        for (const subscriber of subscribers) {
          subscriber(currentState, event);
        }

        const always = definitionConfig.states[currentState.name as StateType["name"]]?.always;
        if (always) {
          applyTransitions(undefined, always);
        }
      };

      const applyTransitions = <
        CurrentState extends StateType,
        CurrentEvent extends EventType | undefined,
        NextState extends StateType,
      >(
        event: CurrentEvent,
        transitions: OneOrMore<Transition<StateType, EventType, CurrentState, CurrentEvent, NextState>>,
      ): boolean => {
        const candidateTransitions: readonly Transition<StateType, EventType, CurrentState, CurrentEvent, NextState>[] =
          Array.isArray(transitions) ? transitions : [transitions];
        for (const candidateTransition of candidateTransitions) {
          const transition = candidateTransition as TransitionWith<
            StateType,
            EventType,
            CurrentState,
            CurrentEvent,
            NextState
          >;
          if (
            !("when" in transition) ||
            transition.when({ state: currentState as CurrentState, event: event as CurrentEvent })
          ) {
            transitionTo(
              {
                ...transition.data?.({ state: currentState as CurrentState, event }),
                ...(!transition.data && enableCopyDataOnTransition ? currentState : {}),
                name: transition.to ?? currentState.name,
              } as unknown as NextState,
              event as CurrentEvent,
              transition.onTransition,
            );
            return true;
          }
        }
        return false;
      };

      let handlingEvent = false;
      const queuedEvents: EventType[] = [];

      const handleEvent = (event: EventType) => {
        if (handlingEvent) {
          queuedEvents.push(event);
          return;
        }

        handlingEvent = true;
        try {
          const { states, on } = definitionConfig;
          const state = states[currentState.name as StateType["name"]];
          if (state) {
            const stateOnEvent = state.on?.[event.type as EventType["type"]];
            // @ts-ignore
            if (stateOnEvent && applyTransitions(event, stateOnEvent)) {
              return;
            }
          }

          const anyStateOnEvent = on?.[event.type as EventType["type"]];
          // @ts-ignore
          if (anyStateOnEvent && applyTransitions(event, anyStateOnEvent)) {
            return;
          }
        } finally {
          handlingEvent = false;
          if (queuedEvents.length) {
            // biome-ignore lint/style/noNonNullAssertion: length checked in previous line
            handleEvent(queuedEvents.shift()!);
          }
        }
      };

      let running = false;

      let machineCleanup: Cleanup | undefined;

      const initMachine = () => {
        const { onStart, onStop } = definitionConfig;
        const cleanupStart = onStart?.(getEffectParams());
        machineCleanup = () => {
          cleanupStart?.();
          onStop?.(getEffectParams())?.();
        };
      };

      const machine: MachineInstance<StateType, EventType> = {
        get state() {
          return currentState;
        },

        send(event) {
          if (!running) {
            throw new Error("Machine is not running");
          }

          handleEvent(event);
        },

        start() {
          if (running) {
            throw new Error("Machine is already running");
          }

          currentState = initialState;
          running = true;
          initMachine();
          initState();
        },

        stop() {
          if (!running) {
            throw new Error("Machine is not running");
          }

          stateCleanup?.();
          stateCleanup = undefined;
          machineCleanup?.();
          machineCleanup = undefined;
          running = false;
          currentState = initialState;
        },

        subscribe(callback) {
          subscribers.push(callback);
          callback(currentState, undefined);

          return () => {
            const index = subscribers.indexOf(callback);
            if (index !== -1) {
              subscribers.splice(index, 1);
            }
          };
        },
      };
      return machine;
    },
  };
};
