import { elevatorMachine } from "./elevatorMachine";

const elevator = elevatorMachine.newInstance().start();

// passenger requests elevator at floor 5
elevator.send({ type: "VISIT_FLOOR", floor: 5 });

// time passes...

// ... doors open at floor 5
// passenger enters elevator and presses floor 12 button
elevator.send({ type: "VISIT_FLOOR", floor: 12 });

// time passes...

elevator.stop();
