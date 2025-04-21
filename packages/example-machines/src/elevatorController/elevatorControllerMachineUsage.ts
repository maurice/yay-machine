import { elevatorMachine } from "../elevator/elevatorMachine";
import { type Elevators, controllerMachine } from "./elevatorControllerMachine";

// start-up
const elevators: Elevators = [
  elevatorMachine.newInstance({
    initialState: {
      name: "doorsClosed",
      currentFloor: 1,
      actionStarted: -1,
      floorsToVisit: [],
    },
  }),
  elevatorMachine.newInstance({
    initialState: {
      name: "doorsClosed",
      currentFloor: 5,
      actionStarted: -1,
      floorsToVisit: [],
    },
  }),
  elevatorMachine.newInstance({
    initialState: {
      name: "doorsClosed",
      currentFloor: 9,
      actionStarted: -1,
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

// shutdown
elevators.forEach((elevator) => elevator.stop());
