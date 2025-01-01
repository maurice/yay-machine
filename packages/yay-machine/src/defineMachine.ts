import type { MachineDefinition } from "./MachineDefinition";
import type { ExtractEvent, MachineEvent } from "./MachineEvent";
import type { MachineInstance, Unsubscribe } from "./MachineInstance";
import type { ExtractState, MachineState, StateContext } from "./MachineState";
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

/**
 * Defines a machine prototype. Use this when you intend to create multiple instances of the same machine.
 * @param definitionConfig describes the machine prototype; it's states and how it responds to events
 * @returns the machine definition, which can be used to create new machine instances
 */
export const defineMachine = <StateType extends MachineState<string>, EventType extends MachineEvent<string>>(
  definitionConfig: MachineDefinitionConfig<StateType, EventType>,
): MachineDefinition<StateType, EventType> => {
  return {
    newInstance(instanceConfig) {
      let currentState = instanceConfig?.initialState ?? definitionConfig.initialState;
      let running = false;
      const subscribers: Array<(state: StateType, event: EventType | undefined) => void> = [];

      const transitionTo = (nextState: StateType, event: EventType | undefined) => {
        currentState = nextState;
        const { states } = definitionConfig;
        const onEntry = states[currentState.name as StateType["name"]]?.onEntry;
        if (onEntry) {
          // biome-ignore lint/suspicious/noExplicitAny: it's fine
          onEntry(machine as any);
        }
        for (const subscriber of subscribers) {
          subscriber(currentState, event);
        }
        const always = states[currentState.name as StateType["name"]]?.always;
        if (always) {
          for (const transition of Array.isArray(always) ? always : [always]) {
            transitionTo({ name: transition.to, ...transition?.with?.(currentState, event) } as StateType, undefined);
            break;
          }
        }
      };

      const machine: MachineInstance<StateType, EventType> = {
        get currentState() {
          return currentState;
        },

        send(event) {
          if (!running) {
            throw new Error("Machine is not running");
          }

          const { states } = definitionConfig;
          const state = states[currentState.name as StateType["name"]];
          if (state) {
            const onEvent = state.on?.[event.type as EventType["type"]];
            if (onEvent) {
              const transitions = Array.isArray(onEvent) ? onEvent : [onEvent];
              for (const transition of transitions) {
                transitionTo({ name: transition.to, ...transition?.with?.(currentState, event) } as StateType, event);
                break;
              }
            }
          }
        },

        start() {
          if (running) {
            throw new Error("Machine is already running");
          }
          running = true;
        },

        stop() {
          if (!running) {
            throw new Error("Machine is not running");
          }
          running = false;
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
