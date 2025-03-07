import deepEqual from "fast-deep-equal";
import type { ReactiveController } from "lit";
import type { YmState } from "./YmState";

const WIGGLE_LEFT_KEY_FRAMES: Keyframe[] = [
  {
    "--state-color": "var(--medium-blue)",
    transform: "rotate(0deg)",
  },
  {
    "--state-color": "var(--medium-blue)",
    transform: "rotate(2deg)",
  },
  {
    "--state-color": "var(--medium-blue)",
    transform: "rotate(0deg)",
  },
  {
    "--state-color": "var(--medium-blue)",
    transform: "rotate(-2deg)",
  },
  {
    // "--state-color": "var(--medium-blue)",
    transform: "rotate(0deg)",
  },
  {
    // "--state-color": "var(--medium-blue)",
    transform: "rotate(2deg)",
  },
  {
    // "--state-color": "var(--medium-blue)",
    transform: "rotate(0deg)",
  },
];

const WIGGLE_RIGHT_KEY_FRAMES: Keyframe[] = WIGGLE_LEFT_KEY_FRAMES.map(
  (it) => ({
    ...it,
    transform:
      it.transform === "rotate(-2deg)"
        ? "rotate(2deg)"
        : it.transform === "rotate(2deg)"
          ? "rotate(-2deg)"
          : it.transform,
  }),
);

const WIGGLE_DIRECTION = [
  WIGGLE_LEFT_KEY_FRAMES,
  WIGGLE_RIGHT_KEY_FRAMES,
] as const;

const WIGGLE_ANIMATION: KeyframeAnimationOptions = {
  duration: 500,
  easing: "cubic-bezier(0.5, 1.8, 0.3, 0.8)", // ease-out-elastic
  iterations: 1,
};

export class AnimateStateController implements ReactiveController {
  static direction = 0;

  host: YmState;
  previousData: object | undefined;

  constructor(host: YmState) {
    (this.host = host).addController(this);
    this.previousData = this.host.data;
  }

  hostUpdated(): void {
    if (this.host.current || this.previousData !== this.host.data) {
      this.host.animate(
        WIGGLE_DIRECTION[AnimateStateController.direction++ % 2],
        WIGGLE_ANIMATION,
      );
    }
    this.previousData = this.host.data;
  }
}
