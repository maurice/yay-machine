import { type MachineInstance, defineMachine } from "yay-machine";
import type { ElevatorEvent, ElevatorState } from "../elevator";

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

const findBestElevatorForRequestedFloor = (
  elevators: Elevators,
  floor: number,
) => {
  // rank elevators by their current queue-length and proximity from the requested floor
  const scores = new Map(
    elevators.map((elevator) => [
      elevator,
      elevator.state.floorsToVisit.length +
        proximityScore(elevator.state, floor),
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

export type Elevators = NonEmptyArray<
  MachineInstance<ElevatorState, ElevatorEvent>
>;

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

export type ControllerEvent =
  | RequestElevatorEvent
  | RequestingEvent
  | ElevatorArrivedEvent;

/**
 * Models a controller that dispatches elevators to requested floors.
 */
export const controllerMachine = defineMachine<
  ControllerState,
  ControllerEvent
>({
  enableCopyDataOnTransition: true, // most transitions don't change the state-data, so copy it by default
  initialState: { name: "idle", elevators: undefined!, pendingRequests: [] },
  onStart: ({ state, send }) => {
    const unsubscribes = state.elevators.map((elevator, index) =>
      elevator.subscribe(({ state: elevatorState }) => {
        if (elevatorState.name === "doorsOpen") {
          send({
            type: "ELEVATOR_ARRIVED",
            elevatorIndex: index,
            floor: elevatorState.currentFloor,
          });
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
            pendingRequests: [
              ...state.pendingRequests,
              { floor: event.floor, elevatorIndex: event.elevatorIndex },
            ],
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
              (request) =>
                request.floor === event.floor &&
                request.elevatorIndex === event.elevatorIndex,
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
        when: ({ state, event }) =>
          state.pendingRequests.some(
            (request) => event.floor === request.floor,
          ),
      },
      {
        to: "requesting",
        onTransition: ({ state, event, send }) => {
          // find the best elevator
          const elevator = findBestElevatorForRequestedFloor(
            state.elevators,
            event.floor,
          );
          const elevatorIndex = state.elevators.indexOf(elevator);
          // send the elevator to the requested floor;
          // once inside the passenger can request their destination floor
          send({
            type: "REQUESTING_ELEVATOR",
            elevator,
            elevatorIndex,
            floor: event.floor,
          });
        },
      },
    ],
  },
});
