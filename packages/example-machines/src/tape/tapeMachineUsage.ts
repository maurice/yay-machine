import type { HardwareInterface } from "./HardwareInterface";
import { tapeMachine } from "./tapeMachine";

// no-op implementation for demonstration only
const hardware: HardwareInterface = {
  engageHead() {},
  disengageHead() {},
  startMotor(_direction: "forward" | "backward", _speed: number) {},
  stopMotor() {},
  getPosition() {
    return 0;
  },
  on(_name: "end" | "start", _callback: () => void) {
    return () => {};
  },
};

const tape = tapeMachine
  .newInstance({
    initialState: { name: "stopped", speed: 0, aspectRatio: "12x9", hardware },
  })
  .start();

const unsubscribe = tape.subscribe(({ state, event }) => {
  console.log("tape state changed", state, event);
});

tape.send({ type: "PLAY" });
tape.send({ type: "SCRUB", direction: "forward" });
tape.send({ type: "SCRUB", direction: "forward" }); // go faster
tape.send({ type: "PLAY" });
tape.send({ type: "PAUSE" });
tape.send({ type: "STOP" });
tape.send({ type: "SCRUB", direction: "backward" });

tape.stop();
unsubscribe();
