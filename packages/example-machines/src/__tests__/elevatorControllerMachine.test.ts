import {
  type Mock,
  afterAll,
  beforeAll,
  beforeEach,
  expect,
  mock,
  test,
} from "bun:test";
import { type InstalledClock, install } from "@sinonjs/fake-timers";
import type { Subscriber } from "yay-machine";
import {
  type Elevators,
  controllerMachine,
} from "../elevatorControllerMachine";
import {
  type ElevatorEvent,
  type ElevatorState,
  elevatorMachine,
} from "../elevatorMachine";

let clock: InstalledClock;

beforeAll(() => {
  clock = install();
});

beforeEach(() => {
  clock.reset();
});

afterAll(() => {
  clock.uninstall();
});

/*
 * Elevator machine tests
 */

const summarize = (
  subscriber: Mock<Subscriber<ElevatorState, ElevatorEvent>>,
) =>
  subscriber.mock.calls.map(([{ state }]) => {
    switch (state.name) {
      case "doorsClosing":
      case "doorsClosed":
      case "doorsOpening":
      case "doorsOpen":
        return `${state.name} @ ${state.currentFloor}`;

      case "goingUp":
      case "goingDown":
        return `${state.name} @ ${state.currentFloor}${state.fractionalFloor ? `.${state.fractionalFloor}` : ""} to ${state.floorsToVisit[0]}${state.floorsToVisit.length > 1 ? ` (then ${state.floorsToVisit.slice(1).join(", ")})` : ""}`;

      default:
        throw new Error(`invalid state: ${state.name}`);
    }
  });

test("controller sends elevators to requested floor", () => {
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
  const subscribers = elevators.map((elevator) => {
    const subscriber = mock();
    elevator.subscribe(subscriber);
    return subscriber;
  });
  const controller = controllerMachine.newInstance({
    initialState: { name: "idle", elevators, pendingRequests: [] },
  });
  const subscriber = mock();
  controller.subscribe(subscriber);
  controller.start();
  expect(controller.state).toEqual({
    name: "idle",
    elevators,
    pendingRequests: [],
  });

  controller.send({ type: "REQUEST_ELEVATOR", floor: 5 });
  controller.send({ type: "REQUEST_ELEVATOR", floor: 13 });
  controller.send({ type: "REQUEST_ELEVATOR", floor: 2 });
  controller.send({ type: "REQUEST_ELEVATOR", floor: 7 });
  controller.send({ type: "REQUEST_ELEVATOR", floor: 2 });
  controller.send({ type: "REQUEST_ELEVATOR", floor: 6 });
  controller.send({ type: "REQUEST_ELEVATOR", floor: 11 });
  expect(controller.state).toEqual({
    name: "busy",
    elevators,
    pendingRequests: [
      { floor: 5, elevatorIndex: 1 },
      { floor: 13, elevatorIndex: 2 },
      { floor: 2, elevatorIndex: 0 },
      { floor: 7, elevatorIndex: 1 },
      { floor: 6, elevatorIndex: 1 },
      { floor: 11, elevatorIndex: 2 },
    ],
  });
  expect(elevators[0].state).toEqual({
    name: "goingUp",
    currentFloor: 1,
    fractionalFloor: 0,
    floorsToVisit: [2],
  });
  expect(elevators[1].state).toEqual({
    name: "doorsOpening",
    currentFloor: 5,
    fractionalFloor: 0,
    floorsToVisit: [6, 7],
  });
  expect(elevators[2].state).toEqual({
    name: "goingUp",
    currentFloor: 9,
    fractionalFloor: 0,
    floorsToVisit: [11, 13],
  });

  // let's see where they stopped
  clock.runAll();
  expect(summarize(subscribers[0]).filter((it) => it.startsWith("doorsOpen ")))
    .toMatchInlineSnapshot(`
[
  "doorsOpen @ 2",
]
`);
  expect(summarize(subscribers[1]).filter((it) => it.startsWith("doorsOpen ")))
    .toMatchInlineSnapshot(`
[
  "doorsOpen @ 5",
  "doorsOpen @ 6",
  "doorsOpen @ 7",
]
`);
  expect(summarize(subscribers[2]).filter((it) => it.startsWith("doorsOpen ")))
    .toMatchInlineSnapshot(`
[
  "doorsOpen @ 11",
  "doorsOpen @ 13",
]
`);
});
