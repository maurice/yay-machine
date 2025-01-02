import type { MachineDefinition } from "./MachineDefinition";
import type { ExtractEvent, MachineEvent } from "./MachineEvent";
import type { MachineInstance, Unsubscribe } from "./MachineInstance";
import type { ExtractState, MachineState, StateData } from "./MachineState";
import type { OneOrMore } from "./OneOrMore";

export interface MachineDefinitionConfig<
  StateType extends MachineState<string>,
  EventType extends MachineEvent<string>,
> {
  readonly initialState: StateType;
  readonly states: StatesConfig<StateType, EventType>;
  readonly onStart?: EffectFunction<StateType, EventType, StateType>;
  readonly onStop?: EffectFunction<StateType, EventType, StateType>;
  readonly on?: TransitionsConfig<StateType, EventType, StateType>;
}

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
  readonly when?: (currentState: CurrentState, currentEvent: CurrentEvent) => boolean;
  readonly onTransition?: TransitionEffectFunction<StateType, EventType, CurrentState, NextState>;
}

export interface TransitionWith<
  StateType extends MachineState<string>,
  EventType extends MachineEvent<string>,
  CurrentState extends StateType,
  CurrentEvent extends EventType | undefined,
  NextState extends StateType,
> extends Transition<StateType, EventType, CurrentState, CurrentEvent, NextState> {
  readonly data: WithFunction<StateType, EventType, CurrentState, CurrentEvent, NextState>;
}

export type WithFunction<
  StateType extends MachineState<string>,
  EventType extends MachineEvent<string>,
  CurrentState extends StateType,
  CurrentEvent extends EventType | undefined,
  NextState extends StateType,
> = (currentState: CurrentState, event: CurrentEvent) => StateData<NextState, NextState["name"]>;

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
  NextState extends StateType,
> = (
  params: TransitionEffectParams<StateType, EventType, CurrentState, NextState>,
  // biome-ignore lint/suspicious/noConfusingVoidType: adding void to union as we don't want to force users to explicity return
) => Unsubscribe | undefined | null | void;

export type TransitionEffectParams<
  StateType extends MachineState<string>,
  EventType extends MachineEvent<string>,
  CurrentState extends StateType,
  NextState extends StateType,
> = EffectParams<StateType, EventType, CurrentState> & {
  readonly next: NextState;
};

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
      const initialState = instanceConfig?.initialState ?? definitionConfig.initialState;
      let currentState = initialState;
      // biome-ignore lint/suspicious/noExplicitAny: happens because we can't guarantee that `currentState` matches the generic `CurrentState` type
      const getEffectParams = () => ({ state: currentState as any, send: machine.send });

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
        onTransition: TransitionEffectFunction<StateType, EventType, CurrentState, NextState> | undefined,
      ) => {
        if (stateCleanup) {
          stateCleanup();
          stateCleanup = undefined;
        }

        if (onTransition) {
          onTransition({ state: currentState as CurrentState, next: nextState, send: machine.send })?.();
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
        for (const transition of candidateTransitions) {
          if (!("when" in transition) || transition.when(currentState as CurrentState, event as CurrentEvent)) {
            transitionTo(
              {
                name: transition.to,
                ...(transition as TransitionWith<StateType, EventType, CurrentState, CurrentEvent, NextState>)?.data?.(
                  currentState as CurrentState,
                  event,
                ),
              } as unknown as NextState,
              event as CurrentEvent,
              transition.onTransition,
            );
            return true;
          }
        }
        return false;
      };

      const machine: MachineInstance<StateType, EventType> = {
        get state() {
          return currentState;
        },

        send(event) {
          if (!running) {
            throw new Error("Machine is not running");
          }

          const { states, on } = definitionConfig;
          const state = states[currentState.name as StateType["name"]];
          if (state) {
            let onEvent = state.on?.[event.type as EventType["type"]];
            // @ts-ignore
            if (onEvent && applyTransitions(event, onEvent)) {
              return;
            }

            onEvent = on?.[event.type as EventType["type"]];
            // @ts-ignore
            if (onEvent && applyTransitions(event, onEvent)) {
              return;
            }
          }
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
