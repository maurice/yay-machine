# Elevators controller

> 🏷️ `transition side-effect`\
> 🏷️ `machine start side-effect`\
> 🏷️ `send event to self`\
> 🏷️ `composing machines`

## About

This example models a controller for a group of coordinated [elevators](./elevator.md).

For example, a large office or apartment building might place 3 elevators together. The controller represents the buttons in the lobby that passengers use to initially request an elevator.

This machine's state data includes *the elevator machine instances*, so it has easy access to them when dispatching them to various floors, and tracking their progress.

In this machine's `onStart()` side-effect it subscribes to the elevators's states and if any reach a `doorsOpen` state and were requested by the controller, sends a `ELEVATOR_ARRIVED` event to the controller machine instance, which removes the floor-request from the pending queue.

When a passenger requests an elevator it checks the existing pending requests and if one already exists for that floor, ignores it (ie, it doesn't add a duplicate request).

When there are no existing requests for that floor, it ranks the elevators using a few simple rules to find the best one. It then creates an "internal" `REQUESTING_ELEVATOR` event whose payload carries the selected elevator, and *sends this event to itself* in the `onTransition()` side-effect, during the transition to the temporary `requesting` state. 

The `requesting` state receives the `REQUESTING_ELEVATOR` event, and sends a `VISIT_FLOOR` event to the selected elevator. Then we return to the `busy` state (and potentially immediately to `idle` via a conditional immediate transition from `busy`) once more and wait for more requests.

The `REQUESTING_ELEVATOR` event shows how we can share ephemeral data between states without having to add it (temporarily) to the machine's state-data.

> 💡 View this example's <a href="https://github.com/maurice/yay-machine/blob/main/packages/example-machines/src/elevatorControllerMachine.ts" target="_blank">source</a> and <a href="https://github.com/maurice/yay-machine/blob/main/packages/example-machines/src/__tests__/elevatorControllerMachine.test.ts" target="_blank">test</a> on GitHub

```typescript
import { type MachineInstance, defineMachine } from "yay-machine";
import {
  type ElevatorEvent,
  type ElevatorState,
  elevatorMachine,
} from "./elevatorMachine";

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
```

## Usage

```typescript
const elevators: Elevators = [
  elevatorMachine.newInstance({
    initialState: {
      name: "doorsClosed",
      currentFloor: 1,
      fractionalFloor: 0,
      floorsToVisit: [],
    },
  }),
  elevatorMachine.newInstance({
    initialState: {
      name: "doorsClosed",
      currentFloor: 5,
      fractionalFloor: 0,
      floorsToVisit: [],
    },
  }),
  elevatorMachine.newInstance({
    initialState: {
      name: "doorsClosed",
      currentFloor: 9,
      fractionalFloor: 0,
      floorsToVisit: [],
    },
  }),
];
elevators.forEach((elevator) => elevator.start());

const controller = controllerMachine
  .newInstance({
    initialState: { name: "idle", elevators, pendingRequests: [] },
  })
  .start();

// passengers request *an elevator* to visit a floor,
// from either the hallway button or the buttons in the car itself
controller.send({ type: "REQUEST_ELEVATOR", floor: 5 });
controller.send({ type: "REQUEST_ELEVATOR", floor: 13 });
controller.send({ type: "REQUEST_ELEVATOR", floor: 2 });
```