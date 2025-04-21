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
  readonly actionStarted: number; // performance.now()
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

export interface ReachedNextFloorEvent {
  readonly type: "REACHED_NEXT_FLOOR";
}

export type ElevatorEvent =
  | VisitFloorEvent
  | CloseDoorsEvent
  | ClosedDoorsEvent
  | OpenDoorsEvent
  | OpenedDoorsEvent
  | ReachedNextFloorEvent;

const sleepThen =
  (
    doneEvent: ElevatorEvent,
    { time = 5000, restartTimer = false } = {},
  ): StateLifecycleSideEffectFunction<ElevatorState, ElevatorEvent> =>
  ({ state, send }) => {
    const elapsed = restartTimer ? 0 : performance.now() - state.actionStarted;
    const delay = Math.max(time - elapsed, 0);
    const timer = setTimeout(send, delay, doneEvent);
    return () => {
      clearTimeout(timer);
    };
  };

const compareFloorToCurrent = (state: ElevatorState, floor: number) =>
  floor - state.currentFloor;

const insertFloor = (state: ElevatorState, floor: number): ElevatorState => {
  if (state.floorsToVisit.includes(floor)) {
    const e = new Error();
    console.warn("looks wrong we already have floor", floor, state, e.stack);
    return state;
  }
  const nextFloor = state.floorsToVisit[0];
  let floorsToVisit = [...state.floorsToVisit, floor];
  floorsToVisit.sort((a, b) => a - b);
  if (nextFloor !== undefined) {
    const direction = compareFloorToCurrent(state, nextFloor);
    const splitIndex = floorsToVisit.findLastIndex((floor) =>
      direction < 0 ? floor < state.currentFloor : floor <= state.currentFloor,
    );
    if (splitIndex !== -1) {
      const [lowerFloors, upperFloors] = [
        floorsToVisit.slice(0, splitIndex + 1),
        floorsToVisit.slice(splitIndex + 1),
      ];
      if (direction > 0) {
        floorsToVisit = upperFloors.concat(lowerFloors.toReversed());
      } else {
        floorsToVisit = lowerFloors.toReversed().concat(upperFloors);
      }
    }
  }

  return { ...state, floorsToVisit };
};

const isAtFloor = (state: ElevatorState, floor: number) =>
  floor === state.currentFloor &&
  state.name !== "goingUp" &&
  state.name !== "goingDown";

/**
 * Models an elevator moving between floors
 */
export const elevatorMachine = defineMachine<ElevatorState, ElevatorEvent>({
  enableCopyDataOnTransition: true, // most transitions don't change the state-data, so copy it by default
  initialState: {
    name: "doorsClosed",
    currentFloor: 1,
    actionStarted: -1,
    floorsToVisit: [],
  },
  states: {
    doorsClosing: {
      onEnter: sleepThen({ type: "CLOSED_DOORS" }),
      on: {
        OPEN_DOORS: {
          to: "doorsOpening",
          data: ({ state }) => ({
            ...state,
            actionStarted: 5000 - performance.now() - state.actionStarted,
            floorsToVisit: state.floorsToVisit.toSpliced(0, 1),
          }),
        },
        CLOSED_DOORS: { to: "doorsClosed" },
      },
    },
    doorsClosed: {
      on: {
        OPEN_DOORS: {
          to: "doorsOpening",
          data: ({ state }) => ({
            ...state,
            actionStarted: performance.now(),
            floorsToVisit: state.floorsToVisit.toSpliced(0, 1),
          }),
        },
      },
      always: [
        {
          to: "goingUp",
          when: ({ state }) =>
            !!state.floorsToVisit[0] &&
            state.floorsToVisit[0] > state.currentFloor,
          data: ({ state }) => ({ ...state, actionStarted: performance.now() }),
        },
        {
          to: "goingDown",
          when: ({ state }) =>
            !!state.floorsToVisit[0] &&
            state.floorsToVisit[0] < state.currentFloor,
          data: ({ state }) => ({ ...state, actionStarted: performance.now() }),
        },
      ],
    },
    doorsOpening: {
      onEnter: sleepThen({ type: "OPENED_DOORS" }),
      on: {
        OPENED_DOORS: { to: "doorsOpen" },
        CLOSE_DOORS: {
          to: "doorsClosing",
          data: ({ state }) => ({ ...state, actionStarted: performance.now() }),
        },
      },
    },
    doorsOpen: {
      onEnter: sleepThen({ type: "CLOSE_DOORS" }, { restartTimer: true }),
      on: {
        OPEN_DOORS: {
          to: "doorsOpen",
        },
        VISIT_FLOOR: {
          to: "doorsOpen",
          when: ({ state, event }) => state.currentFloor === event.floor,
        },
        CLOSE_DOORS: {
          to: "doorsClosing",
          data: ({ state }) => ({ ...state, actionStarted: performance.now() }),
        },
      },
    },
    goingUp: {
      onEnter: sleepThen({ type: "REACHED_NEXT_FLOOR" }),
      on: {
        REACHED_NEXT_FLOOR: [
          {
            to: "goingUp",
            when: ({ state }) =>
              state.floorsToVisit[0] !== state.currentFloor + 1,
            data: ({ state }) => ({
              ...state,
              currentFloor: state.currentFloor + 1,
              actionStarted: performance.now(),
            }),
          },
          {
            to: "doorsOpening",
            data: ({ state }) => ({
              ...state,
              actionStarted: performance.now(),
              currentFloor: state.floorsToVisit[0],
              floorsToVisit: state.floorsToVisit.toSpliced(0, 1),
            }),
          },
        ],
      },
    },
    goingDown: {
      onEnter: sleepThen({ type: "REACHED_NEXT_FLOOR" }),
      on: {
        REACHED_NEXT_FLOOR: [
          {
            to: "goingDown",
            when: ({ state }) =>
              state.floorsToVisit[0] !== state.currentFloor - 1,
            data: ({ state }) => ({
              ...state,
              currentFloor: state.currentFloor - 1,
              actionStarted: performance.now(),
            }),
          },
          {
            to: "doorsOpening",
            data: ({ state }) => ({
              ...state,
              actionStarted: performance.now(),
              currentFloor: state.floorsToVisit[0],
              floorsToVisit: state.floorsToVisit.toSpliced(0, 1),
            }),
          },
        ],
      },
    },
  },
  on: {
    VISIT_FLOOR: [
      {
        to: "doorsOpening",
        when: ({ state, event }) =>
          isAtFloor(state, event.floor) && state.name !== "doorsOpening",
        data: ({ state }) => ({
          ...state,
          actionStarted: performance.now(),
          floorsToVisit: state.floorsToVisit.toSpliced(0, 1),
        }),
      },
      {
        // to: *current-state*
        data: ({ state, event }) => insertFloor(state, event.floor),
        when: ({ state, event }) =>
          !isAtFloor(state, event.floor) || state.name !== "doorsOpening",
      },
    ],
  },
});
