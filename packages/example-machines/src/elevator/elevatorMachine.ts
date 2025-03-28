import {
  type StateLifecycleSideEffectFunction,
  defineMachine,
} from "yay-machine";

export interface ElevatorState {
  readonly name:
    | "doorsClosing"
    | "doorsClosed"
    | "doorsOpening"
    | "doorsOpen"
    | "goingUp"
    | "goingDown";
  readonly currentFloor: number;
  readonly fractionalFloor: number; // workaround for JS number precision; using two integers instead of a float
  readonly floorsToVisit: readonly number[];
}

export interface VisitFloorEvent {
  readonly type: "VISIT_FLOOR";
  readonly floor: number;
}

export interface CloseDoorsEvent {
  readonly type: "CLOSE_DOORS";
}

export interface ClosedDoorsEvent {
  readonly type: "CLOSED_DOORS";
}

export interface OpenDoorsEvent {
  readonly type: "OPEN_DOORS";
}

export interface OpenedDoorsEvent {
  readonly type: "OPENED_DOORS";
}

export interface MoveUpEvent {
  readonly type: "MOVE_UP";
}

export interface MoveDownEvent {
  readonly type: "MOVE_DOWN";
}

export type ElevatorEvent =
  | VisitFloorEvent
  | CloseDoorsEvent
  | ClosedDoorsEvent
  | OpenDoorsEvent
  | OpenedDoorsEvent
  | MoveUpEvent
  | MoveDownEvent;

const sleepThen =
  (
    doneEvent: ElevatorEvent,
    time = 5000,
  ): StateLifecycleSideEffectFunction<ElevatorState, ElevatorEvent> =>
  ({ send }) => {
    const timer = setTimeout(() => send(doneEvent), time);
    return () => clearTimeout(timer);
  };

const insertFloor = (state: ElevatorState, floor: number): ElevatorState => {
  const nextFloor = state.floorsToVisit[0];
  let floorsToVisit = [...new Set([...state.floorsToVisit, floor])];
  floorsToVisit.sort((a, b) => a - b);
  if (nextFloor !== undefined) {
    if (nextFloor > state.currentFloor) {
      const splitIndex = floorsToVisit.findLastIndex(
        (floor) => floor <= state.currentFloor,
      );
      if (splitIndex !== -1) {
        floorsToVisit = floorsToVisit
          .slice(splitIndex + 1)
          .concat(floorsToVisit.slice(0, splitIndex + 1).toReversed());
      }
    } else if (nextFloor < state.currentFloor) {
      const splitIndex = floorsToVisit.findLastIndex(
        (floor) => floor < state.currentFloor,
      );
      if (splitIndex !== -1) {
        floorsToVisit = floorsToVisit
          .slice(0, splitIndex + 1)
          .toReversed()
          .concat(floorsToVisit.slice(splitIndex + 1));
      }
    }
  }
  return { ...state, floorsToVisit };
};

const isAtFloor = (state: ElevatorState, floor: number) =>
  floor === state.currentFloor && state.fractionalFloor === 0;

/**
 * Models an elevator moving between floors
 */
export const elevatorMachine = defineMachine<ElevatorState, ElevatorEvent>({
  enableCopyDataOnTransition: true, // most transitions don't change the state-data, so copy it by default
  initialState: {
    name: "doorsClosed",
    currentFloor: 1,
    fractionalFloor: 0,
    floorsToVisit: [],
  },
  states: {
    doorsClosing: {
      onEnter: sleepThen({ type: "CLOSED_DOORS" }),
      on: {
        OPEN_DOORS: { to: "doorsOpening" },
        CLOSED_DOORS: { to: "doorsClosed" },
      },
    },
    doorsClosed: {
      on: {
        OPEN_DOORS: { to: "doorsOpening" },
      },
      always: [
        {
          to: "goingUp",
          when: ({ state }) =>
            !!state.floorsToVisit[0] &&
            state.floorsToVisit[0] > state.currentFloor,
        },
        {
          to: "goingDown",
          when: ({ state }) =>
            !!state.floorsToVisit[0] &&
            state.floorsToVisit[0] < state.currentFloor,
        },
      ],
    },
    doorsOpening: {
      onEnter: sleepThen({ type: "OPENED_DOORS" }),
      on: {
        OPENED_DOORS: { to: "doorsOpen" },
        CLOSE_DOORS: { to: "doorsClosing" },
      },
    },
    doorsOpen: {
      onEnter: sleepThen({ type: "CLOSE_DOORS" }),
      on: {
        VISIT_FLOOR: {
          to: "doorsOpen",
          when: ({ state, event }) => state.currentFloor === event.floor,
        },
        CLOSE_DOORS: { to: "doorsClosing" },
      },
    },
    goingUp: {
      onEnter: sleepThen({ type: "MOVE_UP" }, 500),
      on: {
        MOVE_UP: {
          to: "goingUp",
          data: ({ state }) => ({
            ...state,
            currentFloor:
              state.fractionalFloor === 9
                ? state.currentFloor + 1
                : state.currentFloor,
            fractionalFloor:
              state.fractionalFloor === 9 ? 0 : state.fractionalFloor + 1,
          }),
        },
      },
      always: {
        to: "doorsOpening",
        when: ({ state }) => state.currentFloor === state.floorsToVisit[0]!,
        data: ({ state }) => ({
          ...state,
          currentFloor: state.floorsToVisit[0]!,
          floorsToVisit: state.floorsToVisit.toSpliced(0, 1),
        }),
      },
    },
    goingDown: {
      onEnter: sleepThen({ type: "MOVE_DOWN" }, 500),
      on: {
        MOVE_DOWN: {
          to: "goingDown",
          data: ({ state }) => ({
            ...state,
            currentFloor:
              state.fractionalFloor === 0
                ? state.currentFloor - 1
                : state.currentFloor,
            fractionalFloor:
              state.fractionalFloor === 0 ? 9 : state.fractionalFloor - 1,
          }),
        },
      },
      always: {
        to: "doorsOpening",
        when: ({ state }) =>
          state.currentFloor === state.floorsToVisit[0]! &&
          state.fractionalFloor === 0,
        data: ({ state }) => ({
          ...state,
          currentFloor: state.floorsToVisit[0]!,
          floorsToVisit: state.floorsToVisit.toSpliced(0, 1),
        }),
      },
    },
  },
  on: {
    VISIT_FLOOR: [
      {
        to: "doorsOpening",
        when: ({ state, event }) => isAtFloor(state, event.floor),
      },
      {
        // to: *current-state*
        data: ({ state, event }) => insertFloor(state, event.floor),
      },
    ],
  },
});
