import {
  type Mock,
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  mock,
  test,
} from "bun:test";
import { type InstalledClock, install } from "@sinonjs/fake-timers";
import type { MachineInstanceOf, Subscriber } from "yay-machine";
import {
  type ElevatorEvent,
  type ElevatorState,
  elevatorMachine,
} from "../elevatorMachine";
import "../elevatorMachineUsage"; // sanity check the documented example

const machines: MachineInstanceOf<typeof elevatorMachine>[] = [];
let clock: InstalledClock;

beforeAll(() => {
  clock = install();
});

beforeEach(() => {
  clock.reset();
});

afterEach(() => {
  for (const machine of machines) {
    machine.stop();
  }
  machines.length = 0;
});

afterAll(() => {
  clock.uninstall();
});

const newMachine = (initialState?: ElevatorState) => {
  const machine = elevatorMachine.newInstance(
    initialState ? { initialState } : undefined,
  );
  machines.push(machine);
  return machine;
};

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
        return `${state.name} @ ${state.currentFloor} to ${state.floorsToVisit[0]}${state.floorsToVisit.length > 1 ? ` (then ${state.floorsToVisit.slice(1).join(", ")})` : ""}`;

      default:
        throw new Error(`invalid state: ${state.name}`);
    }
  });

test("elevator visits floors sensibly", () => {
  const elevator = newMachine();
  const subscriber = mock();
  elevator.subscribe(subscriber);

  elevator.start();
  expect(elevator.state).toEqual({
    name: "doorsClosed",
    currentFloor: 1,
    actionStarted: expect.any(Number),
    floorsToVisit: [],
  });

  elevator.send({ type: "VISIT_FLOOR", floor: 5 });
  expect(elevator.state).toEqual({
    name: "goingUp",
    currentFloor: 1,
    actionStarted: expect.any(Number),
    floorsToVisit: [5],
  });

  elevator.send({ type: "VISIT_FLOOR", floor: 3 });
  expect(elevator.state).toEqual({
    name: "goingUp",
    currentFloor: 1,
    actionStarted: expect.any(Number),
    floorsToVisit: [3, 5],
  });

  clock.runAll();
  expect(subscriber).toHaveBeenCalledTimes(15);
  expect(summarize(subscriber)).toMatchInlineSnapshot(`
    [
      "doorsClosed @ 1",
      "doorsClosed @ 1",
      "goingUp @ 1 to 5",
      "goingUp @ 1 to 3 (then 5)",
      "goingUp @ 2 to 3 (then 5)",
      "doorsOpening @ 3",
      "doorsOpen @ 3",
      "doorsClosing @ 3",
      "doorsClosed @ 3",
      "goingUp @ 3 to 5",
      "goingUp @ 4 to 5",
      "doorsOpening @ 5",
      "doorsOpen @ 5",
      "doorsClosing @ 5",
      "doorsClosed @ 5",
    ]
  `);
  expect(elevator.state).toEqual({
    name: "doorsClosed",
    currentFloor: 5,
    actionStarted: expect.any(Number),
    floorsToVisit: [],
  });

  elevator.send({ type: "VISIT_FLOOR", floor: 2 });
  clock.runAll();
  expect(summarize(subscriber).slice(15)).toMatchInlineSnapshot(`
    [
      "doorsClosed @ 5",
      "goingDown @ 5 to 2",
      "goingDown @ 4 to 2",
      "goingDown @ 3 to 2",
      "doorsOpening @ 2",
      "doorsOpen @ 2",
      "doorsClosing @ 2",
      "doorsClosed @ 2",
    ]
  `);
});

test("requests to visit floors are inserted according to current state", () => {
  const elevator = newMachine();
  const subscriber = mock();
  elevator.subscribe(subscriber);

  elevator.start();

  elevator.send({ type: "VISIT_FLOOR", floor: 5 });
  clock.runAll();
  expect(elevator.state).toEqual({
    name: "doorsClosed",
    currentFloor: 5,
    actionStarted: expect.any(Number),
    floorsToVisit: [],
  });

  // let's make it go down first
  elevator.send({ type: "VISIT_FLOOR", floor: 2 });
  clock.next();
  expect(elevator.state).toEqual({
    name: "goingDown",
    currentFloor: 4,
    actionStarted: expect.any(Number),
    floorsToVisit: [2],
  });

  // add various requests
  elevator.send({ type: "VISIT_FLOOR", floor: 6 });
  elevator.send({ type: "VISIT_FLOOR", floor: 9 });
  elevator.send({ type: "VISIT_FLOOR", floor: 1 });
  expect(elevator.state).toEqual({
    name: "goingDown",
    currentFloor: 4,
    actionStarted: expect.any(Number),
    floorsToVisit: [2, 1, 6, 9],
  });

  // where did it stop?
  clock.runAll();
  expect(subscriber).toHaveBeenCalledTimes(42);
  expect(summarize(subscriber).filter((it) => it.startsWith("doorsOpen ")))
    .toMatchInlineSnapshot(`
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
    currentFloor: 10,
    actionStarted: expect.any(Number),
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
      .slice(42)
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

test("pressing a different floor button inside the elevator adds floor to visit queue", () => {
  const elevator = newMachine();
  const subscriber = mock();
  elevator.subscribe(subscriber);

  // when the lift gets to the 5th floor, request the 9th
  const unsubscribe = elevator.subscribe(({ state }) => {
    if (state.name === "doorsOpen" && state.currentFloor === 5) {
      elevator.send({ type: "VISIT_FLOOR", floor: 9 });
      unsubscribe();
    }
  });

  elevator.start();
  expect(elevator.state).toEqual({
    name: "doorsClosed",
    currentFloor: 1,
    actionStarted: expect.any(Number),
    floorsToVisit: [],
  });

  elevator.send({ type: "VISIT_FLOOR", floor: 5 });
  expect(elevator.state).toEqual({
    name: "goingUp",
    currentFloor: 1,
    actionStarted: expect.any(Number),
    floorsToVisit: [5],
  });

  clock.runAll();
  expect(summarize(subscriber).filter((it) => it.startsWith("doorsOpen ")))
    .toMatchInlineSnapshot(`
    [
      "doorsOpen @ 5",
      "doorsOpen @ 5",
      "doorsOpen @ 9",
    ]
  `);
});

test("pressing the same floor button inside the elevator does nothing", () => {
  const elevator = newMachine();
  const subscriber = mock();
  elevator.subscribe(subscriber);

  // when the lift gets to the 5th floor, request the 9th
  const unsubscribe = elevator.subscribe(({ state }) => {
    if (state.name === "doorsOpen" && state.currentFloor === 5) {
      elevator.send({ type: "VISIT_FLOOR", floor: 5 });
      unsubscribe();
    }
  });

  elevator.start();
  expect(elevator.state).toEqual({
    name: "doorsClosed",
    currentFloor: 1,
    actionStarted: expect.any(Number),
    floorsToVisit: [],
  });

  elevator.send({ type: "VISIT_FLOOR", floor: 5 });
  expect(elevator.state).toEqual({
    name: "goingUp",
    currentFloor: 1,
    actionStarted: expect.any(Number),
    floorsToVisit: [5],
  });

  clock.runAll();
  expect(summarize(subscriber).filter((it) => it.startsWith("doorsOpen ")))
    .toMatchInlineSnapshot(`
    [
      "doorsOpen @ 5",
      "doorsOpen @ 5",
    ]
  `);
});

test("appends higher destination floor to end of queue if opposite direction", () => {
  const elevator1 = newMachine({
    name: "doorsClosed",
    currentFloor: 5,
    actionStarted: -1,
    floorsToVisit: [],
  }).start();
  const subscriber = mock();
  elevator1.subscribe(subscriber);

  elevator1.send({ type: "VISIT_FLOOR", floor: 1 });
  elevator1.send({ type: "VISIT_FLOOR", floor: 3 });
  elevator1.send({ type: "VISIT_FLOOR", floor: 2 });
  elevator1.send({ type: "VISIT_FLOOR", floor: 4 });
  expect(elevator1.state).toEqual({
    name: "goingDown",
    currentFloor: 5,
    actionStarted: expect.any(Number),
    floorsToVisit: [4, 3, 2, 1],
  });

  expect(elevator1.state).toEqual({
    name: "goingDown",
    currentFloor: 5,
    actionStarted: expect.any(Number),
    floorsToVisit: [4, 3, 2, 1],
  });

  clock.tick(1);
  elevator1.send({ type: "VISIT_FLOOR", floor: 5 });
  expect(elevator1.state).toEqual({
    name: "goingDown",
    currentFloor: 5,
    actionStarted: expect.any(Number),
    floorsToVisit: [4, 3, 2, 1, 5],
  });
});

test("appends lower destination floor to end of queue if opposite direction", () => {
  const elevator1 = newMachine({
    name: "doorsClosed",
    currentFloor: 1,
    actionStarted: -1,
    floorsToVisit: [],
  }).start();
  const subscriber = mock();
  elevator1.subscribe(subscriber);

  elevator1.send({ type: "VISIT_FLOOR", floor: 5 });
  elevator1.send({ type: "VISIT_FLOOR", floor: 3 });
  elevator1.send({ type: "VISIT_FLOOR", floor: 2 });
  elevator1.send({ type: "VISIT_FLOOR", floor: 4 });
  expect(elevator1.state).toEqual({
    name: "goingUp",
    currentFloor: 1,
    actionStarted: expect.any(Number),
    floorsToVisit: [2, 3, 4, 5],
  });

  expect(elevator1.state).toEqual({
    name: "goingUp",
    currentFloor: 1,
    actionStarted: expect.any(Number),
    floorsToVisit: [2, 3, 4, 5],
  });

  elevator1.send({ type: "VISIT_FLOOR", floor: 1 });
  expect(elevator1.state).toEqual({
    name: "goingUp",
    currentFloor: 1,
    actionStarted: expect.any(Number),
    floorsToVisit: [2, 3, 4, 5, 1],
  });
});

test("does not re-enter doorsOpening when requested to visit floor if already doorsOpening at floor", () => {
  const elevator = newMachine({
    name: "doorsClosed",
    currentFloor: 1,
    actionStarted: -1,
    floorsToVisit: [],
  }).start();
  const subscriber = mock();
  elevator.subscribe(subscriber);

  elevator.send({ type: "VISIT_FLOOR", floor: 1 });
  elevator.send({ type: "VISIT_FLOOR", floor: 1 });
  expect(summarize(subscriber)).toMatchInlineSnapshot(`
    [
      "doorsClosed @ 1",
      "doorsOpening @ 1",
    ]
  `);
});

test("does not stop once goingUp from current floor when requested to visit same floor", () => {
  const elevator = newMachine({
    name: "doorsClosed",
    currentFloor: 1,
    actionStarted: -1,
    floorsToVisit: [],
  }).start();
  const subscriber = mock();
  elevator.subscribe(subscriber);

  elevator.send({ type: "VISIT_FLOOR", floor: 2 });
  expect(summarize(subscriber)).toMatchInlineSnapshot(`
    [
      "doorsClosed @ 1",
      "doorsClosed @ 1",
      "goingUp @ 1 to 2",
    ]
  `);

  elevator.send({ type: "VISIT_FLOOR", floor: 1 });
  clock.next();
  expect(summarize(subscriber)).toMatchInlineSnapshot(`
    [
      "doorsClosed @ 1",
      "doorsClosed @ 1",
      "goingUp @ 1 to 2",
      "goingUp @ 1 to 2 (then 1)",
      "doorsOpening @ 2",
    ]
  `);
});

test("does not stop once goingDown from current floor when requested to visit same floor", () => {
  const elevator = newMachine({
    name: "doorsClosed",
    currentFloor: 5,
    actionStarted: -1,
    floorsToVisit: [],
  }).start();
  const subscriber = mock();
  elevator.subscribe(subscriber);

  elevator.send({ type: "VISIT_FLOOR", floor: 4 });
  expect(summarize(subscriber)).toMatchInlineSnapshot(`
    [
      "doorsClosed @ 5",
      "doorsClosed @ 5",
      "goingDown @ 5 to 4",
    ]
  `);

  elevator.send({ type: "VISIT_FLOOR", floor: 5 });
  clock.next();
  expect(summarize(subscriber)).toMatchInlineSnapshot(`
    [
      "doorsClosed @ 5",
      "doorsClosed @ 5",
      "goingDown @ 5 to 4",
      "goingDown @ 5 to 4 (then 5)",
      "doorsOpening @ 4",
    ]
  `);
});

test("it takes 5s to travel between each floor going down", () => {
  const elevator = newMachine({
    name: "doorsClosed",
    currentFloor: 5,
    actionStarted: -1,
    floorsToVisit: [],
  }).start();
  const subscriber = mock();
  elevator.subscribe(subscriber);

  elevator.send({ type: "VISIT_FLOOR", floor: 3 });
  expect(summarize(subscriber)).toEqual([
    "doorsClosed @ 5",
    "doorsClosed @ 5",
    "goingDown @ 5 to 3",
  ]);

  clock.tick(2500);
  expect(summarize(subscriber)).toEqual([
    "doorsClosed @ 5",
    "doorsClosed @ 5",
    "goingDown @ 5 to 3",
  ]);

  clock.tick(2500);
  expect(summarize(subscriber)).toEqual([
    "doorsClosed @ 5",
    "doorsClosed @ 5",
    "goingDown @ 5 to 3",
    "goingDown @ 4 to 3",
  ]);

  clock.tick(2500);
  expect(summarize(subscriber)).toEqual([
    "doorsClosed @ 5",
    "doorsClosed @ 5",
    "goingDown @ 5 to 3",
    "goingDown @ 4 to 3",
  ]);

  clock.tick(2500);
  expect(summarize(subscriber)).toEqual([
    "doorsClosed @ 5",
    "doorsClosed @ 5",
    "goingDown @ 5 to 3",
    "goingDown @ 4 to 3",
    "doorsOpening @ 3",
  ]);
});

test("it takes 5s to travel between each floor going up", () => {
  const elevator = newMachine({
    name: "doorsClosed",
    currentFloor: 5,
    actionStarted: -1,
    floorsToVisit: [],
  }).start();
  const subscriber = mock();
  elevator.subscribe(subscriber);

  elevator.send({ type: "VISIT_FLOOR", floor: 7 });
  expect(summarize(subscriber)).toEqual([
    "doorsClosed @ 5",
    "doorsClosed @ 5",
    "goingUp @ 5 to 7",
  ]);

  clock.tick(2500);
  expect(summarize(subscriber)).toEqual([
    "doorsClosed @ 5",
    "doorsClosed @ 5",
    "goingUp @ 5 to 7",
  ]);

  clock.tick(2500);
  expect(summarize(subscriber)).toEqual([
    "doorsClosed @ 5",
    "doorsClosed @ 5",
    "goingUp @ 5 to 7",
    "goingUp @ 6 to 7",
  ]);

  clock.tick(2500);
  expect(summarize(subscriber)).toEqual([
    "doorsClosed @ 5",
    "doorsClosed @ 5",
    "goingUp @ 5 to 7",
    "goingUp @ 6 to 7",
  ]);

  clock.tick(2500);
  expect(summarize(subscriber)).toEqual([
    "doorsClosed @ 5",
    "doorsClosed @ 5",
    "goingUp @ 5 to 7",
    "goingUp @ 6 to 7",
    "doorsOpening @ 7",
  ]);
});

test("it takes 5s to open doors when reaching a requested floor, 5s before doors start closing, and 5s to close doors at floor", () => {
  const elevator = newMachine({
    name: "doorsClosed",
    currentFloor: 1,
    actionStarted: -1,
    floorsToVisit: [],
  }).start();
  const subscriber = mock();
  elevator.subscribe(subscriber);

  elevator.send({ type: "VISIT_FLOOR", floor: 2 });
  clock.tick(5000);
  expect(summarize(subscriber)).toEqual([
    "doorsClosed @ 1",
    "doorsClosed @ 1",
    "goingUp @ 1 to 2",
    "doorsOpening @ 2",
  ]);

  clock.tick(2500);
  expect(summarize(subscriber).slice(4)).toEqual([]);

  clock.tick(2500);
  expect(summarize(subscriber).slice(4)).toEqual(["doorsOpen @ 2"]);

  clock.tick(2500);
  expect(summarize(subscriber).slice(5)).toEqual([]);

  clock.tick(2500);
  expect(summarize(subscriber).slice(5)).toEqual(["doorsClosing @ 2"]);

  clock.tick(2500);
  expect(summarize(subscriber).slice(6)).toEqual([]);

  clock.tick(2500);
  expect(summarize(subscriber).slice(6)).toEqual(["doorsClosed @ 2"]);
});

test("door open time can be extended by using the open-doors button in the elevator cab", () => {
  const elevator = newMachine({
    name: "doorsClosed",
    currentFloor: 1,
    actionStarted: -1,
    floorsToVisit: [],
  }).start();
  const subscriber = mock();
  elevator.subscribe(subscriber);

  elevator.send({ type: "OPEN_DOORS" });
  clock.tick(5000);
  expect(elevator.state.name).toEqual("doorsOpen");

  clock.tick(4999);
  elevator.send({ type: "OPEN_DOORS" });
  expect(elevator.state.name).toEqual("doorsOpen");

  clock.tick(4999);
  elevator.send({ type: "OPEN_DOORS" });
  expect(elevator.state.name).toEqual("doorsOpen");
});
