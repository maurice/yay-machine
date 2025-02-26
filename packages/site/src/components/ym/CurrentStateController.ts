import deepEqual from "fast-deep-equal";
import type { ReactiveController } from "lit";
import type { YmState } from "./YmState";

const WIGGLE_LEFT_KEY_FRAMES: Keyframe[] = [
  {
    transform: "rotate(0deg)",
  },
  {
    transform: "rotate(2deg)",
  },
  {
    transform: "rotate(0deg)",
  },
  {
    transform: "rotate(-2deg)",
  },
  {
    transform: "rotate(0deg)",
  },
  {
    transform: "rotate(2deg)",
  },
  {
    transform: "rotate(0deg)",
  },
];

const WIGGLE_RIGHT_KEY_FRAMES: Keyframe[] =
  WIGGLE_LEFT_KEY_FRAMES.concat().reverse();

const WIGGLE_ANIMATION: KeyframeAnimationOptions = {
  duration: 750,
  easing: "cubic-bezier(0.5, 1.8, 0.3, 0.8)", // ease-out-elastic
  iterations: 1,
};

export class AnimateStateController implements ReactiveController {
  host: YmState;
  previousData: object | undefined;

  constructor(host: YmState) {
    (this.host = host).addController(this);
    this.previousData = this.host.data;
  }

  hostUpdated(): void {
    if (
      this.host.current &&
      ((this.previousData === undefined && this.host.data === undefined) ||
        !deepEqual(this.previousData, this.host.data))
    ) {
      this.host.animate(
        Math.random() < 0.6 ? WIGGLE_LEFT_KEY_FRAMES : WIGGLE_RIGHT_KEY_FRAMES,
        WIGGLE_ANIMATION,
      );
    }
    this.previousData = this.host.data;
  }
}
