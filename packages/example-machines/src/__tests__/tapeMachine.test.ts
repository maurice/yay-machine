import { expect, mock, test } from "bun:test";
import { type HardwareInterface, tapeMachine } from "../tapeMachine";

const mockHardware = () => {
  let position = 0;

  const hardware = {
    engageHead: mock(),
    disengageHead: mock(),
    startMotor: mock(),
    stopMotor: mock(),
    getPosition: mock(() => position),
    on: mock((..._params: Parameters<HardwareInterface["on"]>) => mock()),
  } satisfies HardwareInterface;

  const setPosition = (newPosition: number) => {
    position = newPosition;
  };

  const fireEvent = (name: Parameters<HardwareInterface["on"]>[0]) => {
    const call = hardware.on.mock.calls.find((it) => it[0] === name)!;
    call[1]();
  };

  return { hardware, setPosition, fireEvent };
};

const setup = () => {
  const { hardware, setPosition, fireEvent } = mockHardware();
  const tape = tapeMachine
    .newInstance({ initialState: { name: "stopped", speed: 0, aspectRatio: "12x9", hardware } })
    .start();
  return { tape, hardware, setPosition, fireEvent };
};

test("play, pause, play, stop", () => {
  const { tape, hardware } = setup();
  expect(tape.state).toMatchObject({ name: "stopped", speed: 0 });
  expect(hardware.stopMotor).toHaveBeenCalledTimes(1);
  expect(hardware.disengageHead).toHaveBeenCalledTimes(1);
  expect(hardware.engageHead).not.toHaveBeenCalled();
  expect(hardware.startMotor).not.toHaveBeenCalled();

  tape.send({ type: "PLAY" });
  expect(tape.state).toMatchObject({ name: "playing", speed: 1 });
  expect(hardware.stopMotor).toHaveBeenCalledTimes(1); // still
  expect(hardware.disengageHead).toHaveBeenCalledTimes(1); // still
  expect(hardware.engageHead).toHaveBeenCalledTimes(1);
  expect(hardware.startMotor).toHaveBeenCalledTimes(1);

  tape.send({ type: "PAUSE" });
  expect(tape.state).toMatchObject({ name: "paused", speed: 1 });
  expect(hardware.stopMotor).toHaveBeenCalledTimes(1); // still
  expect(hardware.disengageHead).toHaveBeenCalledTimes(1); // still
  expect(hardware.engageHead).toHaveBeenCalledTimes(1); // still
  expect(hardware.startMotor).toHaveBeenCalledTimes(1); // still

  tape.send({ type: "PLAY" });
  expect(tape.state).toMatchObject({ name: "playing", speed: 1 });
  expect(hardware.stopMotor).toHaveBeenCalledTimes(1); // still
  expect(hardware.disengageHead).toHaveBeenCalledTimes(1); // still
  expect(hardware.engageHead).toHaveBeenCalledTimes(2);
  expect(hardware.startMotor).toHaveBeenCalledTimes(2);

  tape.send({ type: "STOP" });
  expect(tape.state).toMatchObject({ name: "stopped", speed: 0 });
  expect(hardware.stopMotor).toHaveBeenCalledTimes(2);
  expect(hardware.disengageHead).toHaveBeenCalledTimes(2);
  expect(hardware.engageHead).toHaveBeenCalledTimes(2); // still
  expect(hardware.startMotor).toHaveBeenCalledTimes(2); // still
});

test("play, scrub, play", () => {
  const { tape, hardware } = setup();
  expect(tape.state).toMatchObject({ name: "stopped", speed: 0 });
  expect(hardware.stopMotor).toHaveBeenCalledTimes(1);
  expect(hardware.disengageHead).toHaveBeenCalledTimes(1);
  expect(hardware.engageHead).not.toHaveBeenCalled();
  expect(hardware.startMotor).not.toHaveBeenCalled();

  tape.send({ type: "PLAY" });
  expect(tape.state).toMatchObject({ name: "playing", speed: 1 });
  expect(hardware.stopMotor).toHaveBeenCalledTimes(1); // still
  expect(hardware.disengageHead).toHaveBeenCalledTimes(1); // still
  expect(hardware.engageHead).toHaveBeenCalledTimes(1);
  expect(hardware.startMotor).toHaveBeenCalledTimes(1);
  expect(hardware.startMotor).toHaveBeenLastCalledWith("forward", 1);

  tape.send({ type: "SCRUB", direction: "forward" });
  expect(tape.state).toMatchObject({ name: "scrubbing", speed: 2 });
  expect(hardware.stopMotor).toHaveBeenCalledTimes(1); // still
  expect(hardware.disengageHead).toHaveBeenCalledTimes(1); // still
  expect(hardware.engageHead).toHaveBeenCalledTimes(1); // still
  expect(hardware.startMotor).toHaveBeenCalledTimes(2);
  expect(hardware.startMotor).toHaveBeenLastCalledWith("forward", 2);

  tape.send({ type: "PLAY" });
  expect(tape.state).toMatchObject({ name: "playing", speed: 1 });
  expect(hardware.stopMotor).toHaveBeenCalledTimes(1); // still
  expect(hardware.disengageHead).toHaveBeenCalledTimes(1); // still
  expect(hardware.engageHead).toHaveBeenCalledTimes(2);
  expect(hardware.startMotor).toHaveBeenCalledTimes(3);
  expect(hardware.startMotor).toHaveBeenLastCalledWith("forward", 1);
});

test("play to end", () => {
  const { tape, hardware, fireEvent } = setup();
  expect(tape.state).toMatchObject({ name: "stopped", speed: 0 });
  expect(hardware.stopMotor).toHaveBeenCalledTimes(1);
  expect(hardware.disengageHead).toHaveBeenCalledTimes(1);
  expect(hardware.engageHead).not.toHaveBeenCalled();
  expect(hardware.startMotor).not.toHaveBeenCalled();

  tape.send({ type: "PLAY" });
  expect(tape.state).toMatchObject({ name: "playing", speed: 1 });
  expect(hardware.stopMotor).toHaveBeenCalledTimes(1); // still
  expect(hardware.disengageHead).toHaveBeenCalledTimes(1); // still
  expect(hardware.engageHead).toHaveBeenCalledTimes(1);
  expect(hardware.startMotor).toHaveBeenCalledTimes(1);
  expect(hardware.startMotor).toHaveBeenCalledWith("forward", 1);

  fireEvent("end");
  expect(tape.state.name).toBe("stopped");
  expect(tape.state).toMatchObject({ name: "stopped", speed: 0 });
  expect(hardware.stopMotor).toHaveBeenCalledTimes(2);
  expect(hardware.disengageHead).toHaveBeenCalledTimes(2);
  expect(hardware.engageHead).toHaveBeenCalledTimes(1); // still
  expect(hardware.startMotor).toHaveBeenCalledTimes(1); // still
});

test("scrub while stopped", () => {
  const { tape, hardware } = setup();
  expect(tape.state).toMatchObject({ name: "stopped", speed: 0 });
  expect(hardware.stopMotor).toHaveBeenCalledTimes(1);
  expect(hardware.disengageHead).toHaveBeenCalledTimes(1);
  expect(hardware.engageHead).not.toHaveBeenCalled();
  expect(hardware.startMotor).not.toHaveBeenCalled();

  tape.send({ type: "SCRUB", direction: "forward" });
  expect(tape.state).toMatchObject({ name: "scrubbing", speed: 2 });
  expect(hardware.stopMotor).toHaveBeenCalledTimes(1); // still
  expect(hardware.disengageHead).toHaveBeenCalledTimes(1); // still
  expect(hardware.engageHead).not.toHaveBeenCalled(); // still
  expect(hardware.startMotor).toHaveBeenCalledTimes(1);
  expect(hardware.startMotor).toHaveBeenLastCalledWith("forward", 2);

  // faster
  tape.send({ type: "SCRUB", direction: "forward" });
  expect(tape.state).toMatchObject({ name: "scrubbing", speed: 3 });
  expect(hardware.stopMotor).toHaveBeenCalledTimes(1); // still
  expect(hardware.disengageHead).toHaveBeenCalledTimes(1); // still
  expect(hardware.engageHead).not.toHaveBeenCalled(); // still
  expect(hardware.startMotor).toHaveBeenCalledTimes(2);
  expect(hardware.startMotor).toHaveBeenLastCalledWith("forward", 3);

  // faster
  tape.send({ type: "SCRUB", direction: "forward" });
  expect(tape.state).toMatchObject({ name: "scrubbing", speed: 4 });
  expect(hardware.stopMotor).toHaveBeenCalledTimes(1); // still
  expect(hardware.disengageHead).toHaveBeenCalledTimes(1); // still
  expect(hardware.engageHead).not.toHaveBeenCalled(); // still
  expect(hardware.startMotor).toHaveBeenCalledTimes(3);
  expect(hardware.startMotor).toHaveBeenLastCalledWith("forward", 4);
});

test("scrub while playing", () => {
  const { tape, hardware } = setup();
  expect(tape.state).toMatchObject({ name: "stopped", speed: 0 });
  expect(hardware.stopMotor).toHaveBeenCalledTimes(1);
  expect(hardware.disengageHead).toHaveBeenCalledTimes(1);
  expect(hardware.engageHead).not.toHaveBeenCalled();
  expect(hardware.startMotor).not.toHaveBeenCalled();

  tape.send({ type: "PLAY" });
  expect(tape.state).toMatchObject({ name: "playing", speed: 1 });
  expect(hardware.stopMotor).toHaveBeenCalledTimes(1); // still
  expect(hardware.disengageHead).toHaveBeenCalledTimes(1); // still
  expect(hardware.engageHead).toHaveBeenCalledTimes(1);
  expect(hardware.startMotor).toHaveBeenCalledTimes(1);
  expect(hardware.startMotor).toHaveBeenCalledWith("forward", 1);

  tape.send({ type: "SCRUB", direction: "forward" });
  expect(tape.state).toMatchObject({ name: "scrubbing", speed: 2 });
  expect(hardware.stopMotor).toHaveBeenCalledTimes(1); // still
  expect(hardware.disengageHead).toHaveBeenCalledTimes(1); // still
  expect(hardware.engageHead).toHaveBeenCalledTimes(1); // still
  expect(hardware.startMotor).toHaveBeenCalledTimes(2);
  expect(hardware.startMotor).toHaveBeenLastCalledWith("forward", 2);

  // faster
  tape.send({ type: "SCRUB", direction: "forward" });
  expect(tape.state).toMatchObject({ name: "scrubbing", speed: 3 });
  expect(hardware.stopMotor).toHaveBeenCalledTimes(1); // still
  expect(hardware.disengageHead).toHaveBeenCalledTimes(1); // still
  expect(hardware.engageHead).toHaveBeenCalledTimes(1); // still
  expect(hardware.startMotor).toHaveBeenCalledTimes(3);
  expect(hardware.startMotor).toHaveBeenLastCalledWith("forward", 3);

  // faster
  tape.send({ type: "SCRUB", direction: "forward" });
  expect(tape.state).toMatchObject({ name: "scrubbing", speed: 4 });
  expect(hardware.stopMotor).toHaveBeenCalledTimes(1); // still
  expect(hardware.disengageHead).toHaveBeenCalledTimes(1); // still
  expect(hardware.engageHead).toHaveBeenCalledTimes(1); // still
  expect(hardware.startMotor).toHaveBeenCalledTimes(4);
  expect(hardware.startMotor).toHaveBeenLastCalledWith("forward", 4);
});

test("reverse scrubbing direction", () => {
  const { tape, hardware } = setup();
  expect(tape.state).toMatchObject({ name: "stopped", speed: 0 });
  expect(hardware.stopMotor).toHaveBeenCalledTimes(1);
  expect(hardware.disengageHead).toHaveBeenCalledTimes(1);
  expect(hardware.engageHead).not.toHaveBeenCalled();
  expect(hardware.startMotor).not.toHaveBeenCalled();

  tape.send({ type: "SCRUB", direction: "forward" });
  expect(tape.state).toMatchObject({ name: "scrubbing", speed: 2 });
  expect(hardware.stopMotor).toHaveBeenCalledTimes(1); // still
  expect(hardware.disengageHead).toHaveBeenCalledTimes(1); // still
  expect(hardware.engageHead).not.toHaveBeenCalled(); // still
  expect(hardware.startMotor).toHaveBeenCalledTimes(1);
  expect(hardware.startMotor).toHaveBeenLastCalledWith("forward", 2);

  // faster
  tape.send({ type: "SCRUB", direction: "forward" });
  expect(tape.state).toMatchObject({ name: "scrubbing", speed: 3 });
  expect(hardware.stopMotor).toHaveBeenCalledTimes(1); // still
  expect(hardware.disengageHead).toHaveBeenCalledTimes(1); // still
  expect(hardware.engageHead).not.toHaveBeenCalled(); // still
  expect(hardware.startMotor).toHaveBeenCalledTimes(2);
  expect(hardware.startMotor).toHaveBeenLastCalledWith("forward", 3);

  // reverse
  tape.send({ type: "SCRUB", direction: "backward" });
  expect(tape.state).toMatchObject({ name: "scrubbing", speed: -2 });
  expect(hardware.stopMotor).toHaveBeenCalledTimes(1); // still
  expect(hardware.disengageHead).toHaveBeenCalledTimes(1); // still
  expect(hardware.engageHead).not.toHaveBeenCalled(); // still
  expect(hardware.startMotor).toHaveBeenCalledTimes(3);
  expect(hardware.startMotor).toHaveBeenLastCalledWith("backward", 2);

  // faster
  tape.send({ type: "SCRUB", direction: "backward" });
  expect(tape.state).toMatchObject({ name: "scrubbing", speed: -3 });
  expect(hardware.stopMotor).toHaveBeenCalledTimes(1); // still
  expect(hardware.disengageHead).toHaveBeenCalledTimes(1); // still
  expect(hardware.engageHead).not.toHaveBeenCalled(); // still
  expect(hardware.startMotor).toHaveBeenCalledTimes(4);
  expect(hardware.startMotor).toHaveBeenLastCalledWith("backward", 3);
});

test("scrub to end while playing", () => {
  const { tape, hardware, fireEvent } = setup();
  expect(tape.state).toMatchObject({ name: "stopped", speed: 0 });
  expect(hardware.stopMotor).toHaveBeenCalledTimes(1);
  expect(hardware.disengageHead).toHaveBeenCalledTimes(1);
  expect(hardware.engageHead).not.toHaveBeenCalled();
  expect(hardware.startMotor).not.toHaveBeenCalled();

  tape.send({ type: "PLAY" });
  expect(tape.state).toMatchObject({ name: "playing", speed: 1 });
  expect(hardware.stopMotor).toHaveBeenCalledTimes(1); // still
  expect(hardware.disengageHead).toHaveBeenCalledTimes(1); // still
  expect(hardware.engageHead).toHaveBeenCalledTimes(1);
  expect(hardware.startMotor).toHaveBeenCalledTimes(1);
  expect(hardware.startMotor).toHaveBeenCalledWith("forward", 1);

  tape.send({ type: "SCRUB", direction: "forward" });
  expect(tape.state).toMatchObject({ name: "scrubbing", speed: 2 });
  expect(hardware.stopMotor).toHaveBeenCalledTimes(1); // still
  expect(hardware.disengageHead).toHaveBeenCalledTimes(1); // still
  expect(hardware.engageHead).toHaveBeenCalledTimes(1); // still
  expect(hardware.startMotor).toHaveBeenCalledTimes(2);
  expect(hardware.startMotor).toHaveBeenLastCalledWith("forward", 2);

  fireEvent("end");
  expect(tape.state).toMatchObject({ name: "stopped", speed: 0 });
  expect(hardware.stopMotor).toHaveBeenCalledTimes(2);
  expect(hardware.disengageHead).toHaveBeenCalledTimes(2);
  expect(hardware.engageHead).toHaveBeenCalledTimes(1); // still
  expect(hardware.startMotor).toHaveBeenCalledTimes(2); // still
});

test("scrub to end while playing", () => {
  const { tape, hardware, fireEvent, setPosition } = setup();
  setPosition(1);
  expect(tape.state).toMatchObject({ name: "stopped", speed: 0 });
  expect(hardware.stopMotor).toHaveBeenCalledTimes(1);
  expect(hardware.disengageHead).toHaveBeenCalledTimes(1);
  expect(hardware.engageHead).not.toHaveBeenCalled();
  expect(hardware.startMotor).not.toHaveBeenCalled();

  tape.send({ type: "SCRUB", direction: "backward" });
  expect(tape.state).toMatchObject({ name: "scrubbing", speed: -2 });
  expect(hardware.stopMotor).toHaveBeenCalledTimes(1); // still
  expect(hardware.disengageHead).toHaveBeenCalledTimes(1); // still
  expect(hardware.engageHead).not.toHaveBeenCalled(); // still
  expect(hardware.startMotor).toHaveBeenCalledTimes(1);
  expect(hardware.startMotor).toHaveBeenLastCalledWith("backward", 2);

  fireEvent("start");
  expect(tape.state).toMatchObject({ name: "stopped", speed: 0 });
  expect(hardware.stopMotor).toHaveBeenCalledTimes(2);
  expect(hardware.disengageHead).toHaveBeenCalledTimes(2);
  expect(hardware.engageHead).not.toHaveBeenCalled(); // still
  expect(hardware.startMotor).toHaveBeenCalledTimes(1); // still
});
