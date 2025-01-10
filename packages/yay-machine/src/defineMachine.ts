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
import type { MachineInstance, SubscriberParams } from "./MachineInstance";
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
  type Cleanup = () => void;

  // basic validation - the TypeScript types should catch all of these but just in case the user is not using
  // TypeScript or is liberal with `any` etc...
  for (const [name, config] of Object.entries(definitionConfig.states) as readonly [
    StateType["name"],
    StateConfig<StateType, EventType, StateType, boolean>,
  ][]) {
    if (config.always) {
      for (const transition of Array.isArray(config.always) ? config.always : [config.always]) {
        if ("reenter" in transition) {
          throw new Error(`Cannot use 'reenter' with immediate transitions (state ${name})`);
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
                `Cannot use \`reenter: false\` and to another state (${transition.to}) for transition in state ${name} for event ${type}`,
              );
            }
            if (transition.data) {
              throw new Error(
                `Cannot use \`reenter: false\` with \`data()\` for transition in state ${name} for event ${type}`,
              );
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

      const getEffectParams = <CurrentState extends StateType>() => ({
        state: currentState as CurrentState,
        send: machine.send,
      });

      let stateCleanup: Cleanup | undefined;

      const initState = () => {
        const { onEnter, onExit } = definitionConfig.states[currentState.name as StateType["name"]] || {};
        const cleanupEnter = onEnter?.(getEffectParams());
        stateCleanup = () => {
          cleanupEnter?.();
          onExit?.(getEffectParams())?.();
        };
      };

      const subscribers: Array<(params: SubscriberParams<StateType, EventType>) => void> = [];

      const transitionTo = <
        CurrentState extends StateType,
        CurrentEvent extends EventType | undefined,
        NextState extends StateType,
      >(
        nextState: NextState,
        event: CurrentEvent | undefined,
        onTransition: BasicTransition<StateType, EventType, CurrentState, CurrentEvent, NextState>["onTransition"],
      ) => {
        if (stateCleanup) {
          stateCleanup();
          stateCleanup = undefined;
        }

        if (onTransition) {
          // @ts-ignore
          onTransition({ state: currentState, next: nextState, send: machine.send, ...(event && { event }) })?.();
        }

        currentState = nextState;
        initState();

        for (const subscriber of subscribers) {
          subscriber({ state: currentState, event });
        }

        applyAlwaysTransitions();
      };

      const applyAlwaysTransitions = () => {
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
        transitions: OneOrMore<BasicTransition<StateType, EventType, CurrentState, CurrentEvent, NextState>>,
      ): boolean => {
        const candidateTransitions: readonly BasicTransition<
          StateType,
          EventType,
          CurrentState,
          CurrentEvent,
          NextState
        >[] = Array.isArray(transitions) ? transitions : [transitions];
        for (const candidateTransition of candidateTransitions) {
          if (
            "when" in candidateTransition &&
            !candidateTransition.when({ state: currentState as CurrentState, event })
          ) {
            continue;
          }

          // @ts-ignore
          if (isReenterTransitionFalse(candidateTransition)) {
            if (candidateTransition.onTransition) {
              candidateTransition.onTransition({
                state: currentState as CurrentState,
                event,
                next: currentState as NextState,
                send: machine.send,
              })?.();
            }
            return true;
          }

          let nextState: NextState;
          if (isTransitionData(candidateTransition)) {
            const { name, ...nextData } = candidateTransition.data({ state: currentState, event }) as NextState;
            nextState = { name: candidateTransition.to ?? currentState.name, ...nextData } as NextState;
          } else if (enableCopyDataOnTransition) {
            const { name, ...nextData } = currentState;
            nextState = { name: candidateTransition.to ?? currentState.name, ...nextData } as NextState;
          } else {
            nextState = { name: candidateTransition.to ?? currentState.name } as NextState;
          }
          transitionTo(nextState, event as CurrentEvent, candidateTransition.onTransition);
          return true;
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

          running = true;
          initMachine();
          initState();
          applyAlwaysTransitions();

          return machine;
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
