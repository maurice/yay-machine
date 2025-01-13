import { defineMachine } from "yay-machine";

/*
 * Imaginary external hardware interface
 */

export interface HardwareInterface {
  /**
   * Put head to tape; start showing picture
   */
  engageHead(): void;
  /**
   * Remove head from tape; show black screen
   */
  disengageHead(): void;
  /**
   * Start the motor spinning
   */
  startMotor(direction: "forward" | "backward", speed: number): void;
  /**
   * Stop the motor spinning
   */
  stopMotor(): void;
  /**
   * Get the current position, 0..1
   */
  getPosition(): number;
  /**
   * Listen for lifecycle events
   * - end - the tape
   */
  on(name: "end" | "start", callback: () => void): () => void;
}

/*
 * Tape machine: think old school physical VCR or similar
 */

export interface TapeState {
  readonly name: "stopped" | "playing" | "paused" | "scrubbing";
  readonly speed: number;
  readonly aspectRatio: string;
  readonly hardware: HardwareInterface;
}

export type TapeEvent =
  | {
      readonly type: "PLAY" | "PAUSE" | "STOP";
    }
  | {
      readonly type: "SCRUB";
      readonly direction: "forward" | "backward";
    }
  | {
      readonly type: "SET_ASPECT_RATIO";
      readonly aspectRatio: string; // "12x9" etc
    };

export const tapeMachine = defineMachine<TapeState, TapeEvent>({
  enableCopyDataOnTransition: true,
  initialState: { name: "stopped", speed: 0, aspectRatio: "12x9", hardware: undefined! },
  onStart: ({ state, send }) => {
    const cleanupFns = [
      state.hardware.on("end", () => send({ type: "STOP" })),
      state.hardware.on("start", () => send({ type: "STOP" })),
    ];
    return () => cleanupFns.forEach((fn) => fn());
  },
  states: {
    stopped: {
      onEnter: ({ state: { hardware } }) => {
        hardware.stopMotor();
        hardware.disengageHead();
      },
    },
    playing: {
      onEnter: ({ state: { hardware, speed } }) => {
        hardware.engageHead();
        hardware.startMotor("forward", speed);
      },
      on: {
        PAUSE: { to: "paused" },
      },
      always: {
        to: "stopped",
        when: ({ state: { hardware } }) => hardware.getPosition() === 1,
      },
    },
    scrubbing: {
      onEnter: ({ state: { hardware, speed } }) => {
        hardware.startMotor(speed > 1 ? "forward" : "backward", Math.abs(speed));
      },
      on: {
        PAUSE: { to: "paused" },
        SCRUB: [
          {
            to: "scrubbing",
            data: ({ state, event }) => ({ ...state, speed: event.direction === "forward" ? 2 : -2 }),
            when: ({ state, event }) => state.speed > 0 !== (event.direction === "forward"),
          },
          {
            to: "scrubbing",
            data: ({ state }) => ({ ...state, speed: state.speed > 1 ? state.speed + 1 : state.speed - 1 }),
          },
        ],
      },
    },
  },
  on: {
    PLAY: {
      to: "playing",
      data: ({ state }) => ({ ...state, speed: 1 }),
      when: ({ state }) => state.name !== "playing",
    },
    STOP: {
      to: "stopped",
      data: ({ state }) => ({ ...state, speed: 0 }),
    },
    SCRUB: [
      {
        to: "scrubbing",
        when: ({ state: { hardware }, event }) => event.direction === "forward" && hardware.getPosition() < 1,
        data: ({ state }) => ({ ...state, speed: 2 }),
      },
      {
        to: "scrubbing",
        when: ({ state: { hardware }, event }) => event.direction === "backward" && hardware.getPosition() > 0,
        data: ({ state }) => ({ ...state, speed: -2 }),
      },
    ],
    SET_ASPECT_RATIO: {
      data: ({ state, event }) => ({ ...state, aspectRatio: event.aspectRatio }),
    },
  },
});

// Usage

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
