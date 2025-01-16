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
  type ElevatorEvent,
  type ElevatorState,
  type Elevators,
  controllerMachine,
  elevatorMachine,
} from "../elevatorMachines";

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

test("elevator visits floors sensibly", () => {
  const elevator = elevatorMachine.newInstance();
  const subscriber = mock();
  elevator.subscribe(subscriber);

  elevator.start();
  expect(elevator.state).toEqual({
    name: "doorsClosed",
    currentFloor: 1,
    fractionalFloor: 0,
    floorsToVisit: [],
  });

  elevator.send({ type: "VISIT_FLOOR", floor: 5 });
  expect(elevator.state).toEqual({
    name: "goingUp",
    currentFloor: 1,
    fractionalFloor: 0,
    floorsToVisit: [5],
  });

  elevator.send({ type: "VISIT_FLOOR", floor: 3 });
  expect(elevator.state).toEqual({
    name: "goingUp",
    currentFloor: 1,
    fractionalFloor: 0,
    floorsToVisit: [3, 5],
  });

  clock.runAll();
  expect(subscriber).toHaveBeenCalledTimes(53);
  expect(summarize(subscriber)).toMatchInlineSnapshot(`
[
  "doorsClosed @ 1",
  "doorsClosed @ 1",
  "goingUp @ 1 to 5",
  "goingUp @ 1 to 3 (then 5)",
  "goingUp @ 1.1 to 3 (then 5)",
  "goingUp @ 1.2 to 3 (then 5)",
  "goingUp @ 1.3 to 3 (then 5)",
  "goingUp @ 1.4 to 3 (then 5)",
  "goingUp @ 1.5 to 3 (then 5)",
  "goingUp @ 1.6 to 3 (then 5)",
  "goingUp @ 1.7 to 3 (then 5)",
  "goingUp @ 1.8 to 3 (then 5)",
  "goingUp @ 1.9 to 3 (then 5)",
  "goingUp @ 2 to 3 (then 5)",
  "goingUp @ 2.1 to 3 (then 5)",
  "goingUp @ 2.2 to 3 (then 5)",
  "goingUp @ 2.3 to 3 (then 5)",
  "goingUp @ 2.4 to 3 (then 5)",
  "goingUp @ 2.5 to 3 (then 5)",
  "goingUp @ 2.6 to 3 (then 5)",
  "goingUp @ 2.7 to 3 (then 5)",
  "goingUp @ 2.8 to 3 (then 5)",
  "goingUp @ 2.9 to 3 (then 5)",
  "goingUp @ 3 to 3 (then 5)",
  "doorsOpening @ 3",
  "doorsOpen @ 3",
  "doorsClosing @ 3",
  "doorsClosed @ 3",
  "goingUp @ 3 to 5",
  "goingUp @ 3.1 to 5",
  "goingUp @ 3.2 to 5",
  "goingUp @ 3.3 to 5",
  "goingUp @ 3.4 to 5",
  "goingUp @ 3.5 to 5",
  "goingUp @ 3.6 to 5",
  "goingUp @ 3.7 to 5",
  "goingUp @ 3.8 to 5",
  "goingUp @ 3.9 to 5",
  "goingUp @ 4 to 5",
  "goingUp @ 4.1 to 5",
  "goingUp @ 4.2 to 5",
  "goingUp @ 4.3 to 5",
  "goingUp @ 4.4 to 5",
  "goingUp @ 4.5 to 5",
  "goingUp @ 4.6 to 5",
  "goingUp @ 4.7 to 5",
  "goingUp @ 4.8 to 5",
  "goingUp @ 4.9 to 5",
  "goingUp @ 5 to 5",
  "doorsOpening @ 5",
  "doorsOpen @ 5",
  "doorsClosing @ 5",
  "doorsClosed @ 5",
]
`);
  expect(elevator.state).toEqual({
    name: "doorsClosed",
    currentFloor: 5,
    fractionalFloor: 0,
    floorsToVisit: [],
  });

  elevator.send({ type: "VISIT_FLOOR", floor: 2 });
  clock.runAll();
  expect(summarize(subscriber).slice(53)).toMatchInlineSnapshot(`
[
  "doorsClosed @ 5",
  "goingDown @ 5 to 2",
  "goingDown @ 4.9 to 2",
  "goingDown @ 4.8 to 2",
  "goingDown @ 4.7 to 2",
  "goingDown @ 4.6 to 2",
  "goingDown @ 4.5 to 2",
  "goingDown @ 4.4 to 2",
  "goingDown @ 4.3 to 2",
  "goingDown @ 4.2 to 2",
  "goingDown @ 4.1 to 2",
  "goingDown @ 4 to 2",
  "goingDown @ 3.9 to 2",
  "goingDown @ 3.8 to 2",
  "goingDown @ 3.7 to 2",
  "goingDown @ 3.6 to 2",
  "goingDown @ 3.5 to 2",
  "goingDown @ 3.4 to 2",
  "goingDown @ 3.3 to 2",
  "goingDown @ 3.2 to 2",
  "goingDown @ 3.1 to 2",
  "goingDown @ 3 to 2",
  "goingDown @ 2.9 to 2",
  "goingDown @ 2.8 to 2",
  "goingDown @ 2.7 to 2",
  "goingDown @ 2.6 to 2",
  "goingDown @ 2.5 to 2",
  "goingDown @ 2.4 to 2",
  "goingDown @ 2.3 to 2",
  "goingDown @ 2.2 to 2",
  "goingDown @ 2.1 to 2",
  "goingDown @ 2 to 2",
  "doorsOpening @ 2",
  "doorsOpen @ 2",
  "doorsClosing @ 2",
  "doorsClosed @ 2",
]
`);
});

test("requests to visit floors are inserted according to current state", () => {
  const elevator = elevatorMachine.newInstance();
  const subscriber = mock();
  elevator.subscribe(subscriber);

  elevator.start();

  elevator.send({ type: "VISIT_FLOOR", floor: 5 });
  clock.runAll();
  expect(elevator.state).toEqual({
    name: "doorsClosed",
    currentFloor: 5,
    fractionalFloor: 0,
    floorsToVisit: [],
  });

  // let's make it go down first
  elevator.send({ type: "VISIT_FLOOR", floor: 2 });
  clock.next();
  expect(elevator.state).toEqual({
    name: "goingDown",
    currentFloor: 4,
    fractionalFloor: 9,
    floorsToVisit: [2],
  });

  // add various requests
  elevator.send({ type: "VISIT_FLOOR", floor: 6 });
  elevator.send({ type: "VISIT_FLOOR", floor: 9 });
  elevator.send({ type: "VISIT_FLOOR", floor: 1 });
  expect(elevator.state).toEqual({
    name: "goingDown",
    currentFloor: 4,
    fractionalFloor: 9,
    floorsToVisit: [2, 1, 6, 9],
  });

  // where did it stop?
  clock.runAll();
  expect(subscriber).toHaveBeenCalledTimes(191);
  expect(
    summarize(subscriber).filter((it) => it.startsWith("doorsOpen ")),
  ).toMatchInlineSnapshot(`
[
  "doorsOpen @ 5",
  "doorsOpen @ 2",
  "doorsOpen @ 1",
  "doorsOpen @ 6",
  "doorsOpen @ 9",
]
`);

  // now make it go up
  elevator.send({ type: "VISIT_FLOOR", floor: 14 });
  clock.next();
  expect(elevator.state).toEqual({
    name: "goingUp",
    currentFloor: 9,
    fractionalFloor: 1,
    floorsToVisit: [14],
  });

  // add various requests
  elevator.send({ type: "VISIT_FLOOR", floor: 6 });
  elevator.send({ type: "VISIT_FLOOR", floor: 18 });
  elevator.send({ type: "VISIT_FLOOR", floor: 9 });
  elevator.send({ type: "VISIT_FLOOR", floor: 1 });

  // where did it stop?
  clock.runAll();
  expect(
    summarize(subscriber)
      .slice(191)
      .filter((it) => it.startsWith("doorsOpen ")),
  ).toMatchInlineSnapshot(`
[
  "doorsOpen @ 14",
  "doorsOpen @ 18",
  "doorsOpen @ 9",
  "doorsOpen @ 6",
  "doorsOpen @ 1",
]
`);
});

/*
 * Elevator controller tests
 */

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
  expect(
    summarize(subscribers[0]).filter((it) => it.startsWith("doorsOpen ")),
  ).toMatchInlineSnapshot(`
[
  "doorsOpen @ 2",
]
`);
  expect(
    summarize(subscribers[1]).filter((it) => it.startsWith("doorsOpen ")),
  ).toMatchInlineSnapshot(`
[
  "doorsOpen @ 5",
  "doorsOpen @ 6",
  "doorsOpen @ 7",
]
`);
  expect(
    summarize(subscribers[2]).filter((it) => it.startsWith("doorsOpen ")),
  ).toMatchInlineSnapshot(`
[
  "doorsOpen @ 11",
  "doorsOpen @ 13",
]
`);
});
