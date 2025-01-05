import type { MachineDefinition } from "./MachineDefinition";
import type {
  EffectFunction,
  HomogenousStateMachineDefinitionConfig,
  MachineDefinitionConfig,
  Transition,
  TransitionWithData,
} from "./MachineDefinitionConfig";
import type { MachineEvent } from "./MachineEvent";
import type { MachineInstance } from "./MachineInstance";
import type { MachineState } from "./MachineState";
import type { OneOrMore } from "./OneOrMore";

/**
 * Defines a machine prototype. Use this when you intend to create multiple instances of the same machine.
 * @param definitionConfig describes the machine prototype; it's states and how it responds to events
 * @returns the machine definition, which can be used to create new machine instances
 */
export const defineMachine = <StateType extends MachineState, EventType extends MachineEvent>(
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
        CurrentEvent extends EventType | undefined,
        NextState extends StateType,
      >(
        nextState: NextState,
        event: CurrentEvent | undefined,
        onTransition: EffectFunction<StateType, EventType, CurrentState, CurrentEvent, NextState> | undefined,
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
          const transition = candidateTransition as TransitionWithData<
            StateType,
            EventType,
            CurrentState,
            CurrentEvent,
            NextState
          >;
          if (
            !("when" in transition) ||
            // @ts-ignore
            transition.when({ state: currentState, ...(event && { event }) })
          ) {
            transitionTo(
              {
                // @ts-ignore
                ...transition.data?.({ state: currentState, ...(event && { event }) }),
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
