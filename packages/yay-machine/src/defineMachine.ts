import type { MachineDefinition } from "./MachineDefinition";
import type {
  BasicTransition,
  HomogenousStateMachineDefinitionConfigCopyDataOnTransitionFalse,
  HomogenousStateMachineDefinitionConfigCopyDataOnTransitionTrue,
  MachineDefinitionConfig,
  ReenterTransition,
  StateConfig,
  TransitionConfig,
  TransitionData,
} from "./MachineDefinitionConfig";
import type { MachineEvent } from "./MachineEvent";
import type { MachineInstance, Subscriber } from "./MachineInstance";
import type { MachineState } from "./MachineState";
import type { OneOrMore } from "./OneOrMore";

/**
 * Defines a machine prototype. Use this when you intend to create multiple instances of the same machine.
 * @param definitionConfig describes the machine prototype; it's states and how it responds to events
 * @returns the machine definition, which can be used to create new machine instances
 * @throws {Error} if the definition is invalid
 */
export const defineMachine = <StateType extends MachineState, EventType extends MachineEvent>(
  definitionConfig: MachineDefinitionConfig<StateType, EventType>,
): MachineDefinition<StateType, EventType> => {
  type Cleanup = (event: EventType | undefined) => void;

  // basic validation - the TypeScript types should catch all of these but just in case the user is not using
  // TypeScript or is liberal with `any` etc...
  if (definitionConfig.states) {
    for (const [name, config] of Object.entries(definitionConfig.states) as readonly [
      StateType["name"],
      StateConfig<StateType, EventType, StateType, boolean>,
    ][]) {
      if (config.always) {
        for (const transition of Array.isArray(config.always) ? config.always : [config.always]) {
          if ("reenter" in transition) {
            throw new Error(`Cannot use 'reenter' with immediate transitions in state "${name}"`);
          }
        }
      }
      if (config.on) {
        for (const [type, tx] of Object.entries(config.on) as readonly [
          EventType["type"],
          TransitionConfig<StateType, EventType, StateType, EventType, boolean, false>,
        ][]) {
          for (const transition of Array.isArray(tx) ? tx : [tx]) {
            if ("reenter" in transition && transition.reenter === false) {
              if (transition.to !== name) {
                throw new Error(
                  `Cannot use \`reenter: false\` to another state "${transition.to}" for transition in state "${name}" via event "${type}"`,
                );
              }
              if (transition.data) {
                throw new Error(
                  `Cannot use \`reenter: false\` with \`data()\` for transition in state "${name}" via event "${type}"`,
                );
              }
            }
          }
        }
      }
    }
  }

  return {
    newInstance(instanceConfig) {
      const enableCopyDataOnTransition = (
        definitionConfig as
          | HomogenousStateMachineDefinitionConfigCopyDataOnTransitionTrue<StateType, EventType>
          | HomogenousStateMachineDefinitionConfigCopyDataOnTransitionFalse<StateType, EventType>
      ).enableCopyDataOnTransition;
      const initialState = instanceConfig?.initialState ?? definitionConfig.initialState;
      let currentState = initialState;

      const getEffectParams = <CurrentState extends StateType>(event: EventType | undefined) => {
        let disposed = false;
        const dispose = () => {
          disposed = true;
        };
        return [
          {
            state: currentState as CurrentState,
            event,
            send: (event: EventType) => {
              if (!disposed) {
                machine.send(event);
              }
            },
          },
          dispose,
        ] as const;
      };

      let disposeState: Cleanup | undefined;

      const initState = <CurrentState extends StateType>(event: EventType | undefined) => {
        const { onEnter, onExit } = definitionConfig.states?.[currentState.name as StateType["name"]] || {};
        const [enterParams, disposeEnterParams] = getEffectParams<CurrentState>(event);
        // @ts-ignore
        const disposeEnter = onEnter?.(enterParams);
        disposeState = (disposeEvent) => {
          disposeEnterParams();
          disposeEnter?.();
          const [exitParams, disposeExitParams] = getEffectParams(disposeEvent);
          // @ts-ignore
          onExit?.(exitParams)?.();
          disposeExitParams();
        };
      };

      const subscribers: Array<Subscriber<StateType, EventType>> = [];

      const transitionTo = <
        CurrentState extends StateType,
        CurrentEvent extends EventType | undefined,
        NextState extends StateType,
      >(
        nextState: NextState,
        event: CurrentEvent | undefined,
        onTransition: BasicTransition<StateType, EventType, CurrentState, CurrentEvent, NextState>["onTransition"],
      ) => {
        if (disposeState) {
          disposeState(event);
          disposeState = undefined;
        }

        if (onTransition) {
          const [transitionParams, disposeTransitionParams] = getEffectParams(event);
          // @ts-ignore
          onTransition({ ...transitionParams, next: nextState, ...(event && { event }) })?.();
          disposeTransitionParams();
        }

        currentState = nextState;
        initState(event);

        for (const subscriber of subscribers) {
          subscriber({ state: currentState, event });
        }
      };

      const applyAlwaysTransitions = () => {
        const always = definitionConfig.states?.[currentState.name as StateType["name"]]?.always;
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
        transitions: OneOrMore<BasicTransition<StateType, EventType, CurrentState, CurrentEvent, NextState>>,
      ): boolean => {
        for (const transition of Array.isArray(transitions) ? transitions : [transitions]) {
          if (tryTransition(event, transition)) {
            applyAlwaysTransitions();
            return true;
          }
        }
        return false;
      };

      const tryTransition = <
        CurrentState extends StateType,
        CurrentEvent extends EventType | undefined,
        NextState extends StateType,
      >(
        event: CurrentEvent,
        transition: BasicTransition<StateType, EventType, CurrentState, CurrentEvent, NextState>,
      ): boolean => {
        if ("when" in transition && !transition.when({ state: currentState as CurrentState, event })) {
          return false;
        }

        if (isReenterTransitionFalse(transition)) {
          const [transitionParams, disposeTransitionParams] = getEffectParams(event);
          if (transition.onTransition) {
            // @ts-ignore
            transition.onTransition({
              ...transitionParams,
              event,
              next: currentState as NextState,
            })?.();
            disposeTransitionParams();
          }
          return true;
        }

        let nextState: NextState;
        if (isTransitionData(transition)) {
          const { name, ...nextData } = transition.data({ state: currentState, event }) as NextState;
          nextState = { name: transition.to ?? currentState.name, ...nextData } as NextState;
        } else if (enableCopyDataOnTransition) {
          const { name, ...nextData } = currentState;
          nextState = { name: transition.to ?? currentState.name, ...nextData } as NextState;
        } else {
          nextState = { name: transition.to ?? currentState.name } as NextState;
        }
        transitionTo(nextState, event as CurrentEvent, transition.onTransition);
        return true;
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
          const state = states?.[currentState.name as StateType["name"]];
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
          handleNextQueuedEvent();
        }
      };

      const handleNextQueuedEvent = () => {
        const event = queuedEvents.shift();
        if (event) {
          handleEvent(event);
        }
      };

      let running = false;
      let starting = false;
      let stopping = false;

      let disposeMachine: Cleanup | undefined;

      const initMachine = () => {
        const { onStart, onStop } = definitionConfig;
        const [startParams, disposeStartParams] = getEffectParams(undefined);
        const disposeStart = onStart?.(startParams);
        disposeMachine = (disposeEvent) => {
          disposeStartParams();
          disposeStart?.();
          const [stopParams, disposeStopParams] = getEffectParams(disposeEvent);
          const disposeStop = onStop?.(stopParams);
          disposeStopParams();
          disposeStop?.();
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
          if (stopping) {
            throw new Error("Machine is already stopping");
          }
          if (running) {
            throw new Error("Machine is already running");
          }

          starting = true;
          running = true;
          handlingEvent = true;
          initMachine();
          initState(undefined);
          applyAlwaysTransitions();

          starting = false;
          handlingEvent = false;
          handleNextQueuedEvent();

          return machine;
        },

        stop() {
          if (!running) {
            throw new Error("Machine is not running");
          }
          if (starting) {
            throw new Error("Machine is already starting");
          }

          stopping = true;
          handlingEvent = true;
          disposeState?.(undefined);
          disposeState = undefined;
          disposeMachine?.(undefined);
          disposeMachine = undefined;
          running = false;

          stopping = false;
          handlingEvent = false;
          queuedEvents.length = 0;
        },

        subscribe(callback) {
          subscribers.push(callback);
          callback({ state: currentState, event: undefined });

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

const isTransitionData = <
  StateType extends MachineState,
  EventType extends MachineEvent,
  CurrentState extends StateType,
  CurrentEvent extends EventType | undefined,
  NextState extends StateType,
>(
  transition: object,
): transition is TransitionData<StateType, EventType, CurrentState, CurrentEvent, NextState> => "data" in transition;

const isReenterTransitionFalse = (transition: object): transition is ReenterTransition<false> =>
  "reenter" in transition && transition.reenter === false;
