import type { EffectParams } from "../MachineDefinitionConfig";
import type { MachineInstance } from "../MachineInstance";
import { defineMachine } from "../defineMachine";

/*
 * This file contains two machines: one for the elevator and one for the elevator controller.
 */

/*
 * Elevator machine: models an elevator moving between floors.
 */

export interface ElevatorState {
  readonly name: "doorsClosing" | "doorsClosed" | "doorsOpening" | "doorsOpen" | "goingUp" | "goingDown";
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
  (doneEvent: ElevatorEvent, time = 5000) =>
  ({ send }: EffectParams<ElevatorState, ElevatorEvent, ElevatorState>) => {
    const timer = setTimeout(() => send(doneEvent), time);
    return () => clearTimeout(timer);
  };

const insertFloor = (state: ElevatorState, floor: number): ElevatorState => {
  const nextFloor = state.floorsToVisit[0];
  let floorsToVisit = [...new Set([...state.floorsToVisit, floor])];
  floorsToVisit.sort((a, b) => a - b);
  if (nextFloor !== undefined) {
    if (nextFloor > state.currentFloor) {
      const splitIndex = floorsToVisit.findLastIndex((floor) => floor <= state.currentFloor);
      if (splitIndex !== -1) {
        floorsToVisit = floorsToVisit.slice(splitIndex + 1).concat(floorsToVisit.slice(0, splitIndex + 1).toReversed());
      }
    } else if (nextFloor < state.currentFloor) {
      const splitIndex = floorsToVisit.findLastIndex((floor) => floor < state.currentFloor);
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

const isAtFloor = (state: ElevatorState, floor: number) => floor === state.currentFloor && state.fractionalFloor === 0;

export const elevatorMachine = defineMachine<ElevatorState, ElevatorEvent>({
  enableCopyDataOnTransition: true, // most transitions don't change the state-data, so copy it by default
  initialState: { name: "doorsClosed", currentFloor: 1, fractionalFloor: 0, floorsToVisit: [] },
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
        OPEN_DOORS: { to: "doorsOpening", data: ({ state }) => state },
      },
      always: [
        {
          to: "goingUp",
          when: ({ state }) => !!state.floorsToVisit[0] && state.floorsToVisit[0] > state.currentFloor,
        },
        {
          to: "goingDown",
          when: ({ state }) => !!state.floorsToVisit[0] && state.floorsToVisit[0] < state.currentFloor,
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
        },
        CLOSE_DOORS: {
          to: "doorsClosing",
        },
      },
    },
    goingUp: {
      onEnter: sleepThen({ type: "MOVE_UP" }, 500),
      on: {
        MOVE_UP: {
          to: "goingUp",
          data: ({ state }) => ({
            ...state,
            currentFloor: state.fractionalFloor === 9 ? state.currentFloor + 1 : state.currentFloor,
            fractionalFloor: state.fractionalFloor === 9 ? 0 : state.fractionalFloor + 1,
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
            currentFloor: state.fractionalFloor === 0 ? state.currentFloor - 1 : state.currentFloor,
            fractionalFloor: state.fractionalFloor === 0 ? 9 : state.fractionalFloor - 1,
          }),
        },
      },
      always: {
        to: "doorsOpening",
        when: ({ state }) => state.currentFloor === state.floorsToVisit[0]! && state.fractionalFloor === 0,
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

/*
 * Elevator controller machine: models a controller that dispatches elevators to requested floors.
 */

const proximityScore = (state: ElevatorState, floor: number) => {
  const absoluteDistance = Math.abs(state.currentFloor - floor);
  if (
    (state.name === "goingUp" && floor <= state.currentFloor) ||
    (state.name === "goingDown" && floor >= state.currentFloor)
  ) {
    return absoluteDistance * 2;
  }
  return absoluteDistance;
};

const findBestElevatorForRequestedFloor = (elevators: Elevators, floor: number) => {
  // rank elevators by their current queue-length and proximity from the requested floor
  const scores = new Map(
    elevators.map((elevator) => [
      elevator,
      elevator.state.floorsToVisit.length + proximityScore(elevator.state, floor),
    ]),
  );
  const scored = [...scores.entries()].sort((a, b) => a[1] - b[1]);
  return scored[0]![0];
};

export interface ControllerState {
  readonly name: "idle" | "requesting" | "busy";
  readonly elevators: Elevators;
  readonly pendingRequests: readonly PendingRequest[];
}

interface PendingRequest {
  readonly floor: number;
  readonly elevatorIndex: number;
}

type NonEmptyArray<T> = readonly [T, ...T[]];

export type Elevators = NonEmptyArray<MachineInstance<ElevatorState, ElevatorEvent>>;

export interface RequestElevatorEvent {
  readonly type: "REQUEST_ELEVATOR";
  readonly floor: number;
}

export interface RequestingEvent extends PendingRequest {
  readonly type: "REQUESTING_ELEVATOR";
  readonly elevator: MachineInstance<ElevatorState, ElevatorEvent>;
}

export interface ElevatorArrivedEvent {
  readonly type: "ELEVATOR_ARRIVED";
  readonly elevatorIndex: number;
  readonly floor: number;
}

export type ControllerEvent = RequestElevatorEvent | RequestingEvent | ElevatorArrivedEvent;

export const controllerMachine = defineMachine<ControllerState, ControllerEvent>({
  enableCopyDataOnTransition: true, // most transitions don't change the state-data, so copy it by default
  initialState: { name: "idle", elevators: undefined!, pendingRequests: [] },
  onStart: ({ state, send }) => {
    const unsubscribes = state.elevators.map((elevator, index) =>
      elevator.subscribe((elevatorState) => {
        if (elevatorState.name === "doorsOpen") {
          send({ type: "ELEVATOR_ARRIVED", elevatorIndex: index, floor: elevatorState.currentFloor });
        }
      }),
    );
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  },
  states: {
    requesting: {
      on: {
        REQUESTING_ELEVATOR: {
          to: "busy",
          data: ({ state, event }) => ({
            ...state,
            pendingRequests: [...state.pendingRequests, { floor: event.floor, elevatorIndex: event.elevatorIndex }],
          }),
          onTransition: ({ event: { elevator, floor } }) => {
            elevator.send({ type: "VISIT_FLOOR", floor: floor });
          },
        },
      },
    },
    busy: {
      on: {
        ELEVATOR_ARRIVED: {
          to: "busy",
          data: ({ state, event }) => ({
            ...state,
            pendingRequests: state.pendingRequests.filter(
              (request) => request.floor === event.floor && request.elevatorIndex === event.elevatorIndex,
            ),
          }),
        },
      },
      always: {
        to: "idle",
        when: ({ state }) => state.pendingRequests.length === 0,
      },
    },
  },
  on: {
    REQUEST_ELEVATOR: [
      {
        to: "busy",
        when: ({ state, event }) => state.pendingRequests.some((request) => event.floor === request.floor),
      },
      {
        to: "requesting",
        onTransition: ({ state, event, send }) => {
          // find the best elevator
          const elevator = findBestElevatorForRequestedFloor(state.elevators, event.floor);
          const elevatorIndex = state.elevators.indexOf(elevator);
          // send the elevator to the requested floor;
          // once inside the passenger can request their destination floor
          send({ type: "REQUESTING_ELEVATOR", elevator, elevatorIndex, floor: event.floor });
        },
      },
    ],
  },
});
