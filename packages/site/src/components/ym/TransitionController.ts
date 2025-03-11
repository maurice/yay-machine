import type { ReactiveController } from "lit";
import type { YmChart } from "./YmChart";
import type { YmTransition } from "./YmTransition";

const POP_KEY_FRAMES: Keyframe[] = [
  {
    borderColor: "var(--medium-blue)",
    color: "var(--medium-blue)",
    // border: "2px solid var(--medium-blue)",
    transform: "scale(1)",
  },
  {
    borderColor: "var(--medium-blue)",
    color: "var(--medium-blue)",
    // border: "2px solid var(--medium-blue)",
    transform: "scale(1.1)",
    // offset: 0.1,
  },
  {
    // borderColor: "var(--medium-blue)",
    // color: "var(--medium-blue)",
    // border: "2px solid var(--medium-blue)",
    transform: "scale(1)",
    // offset: 1,
  },
];

const POP_ANIMATION: KeyframeAnimationOptions = {
  duration: 300,
  easing: "ease-out",
  // easing: "cubic-bezier(0.7, 0, 0.84, 0)", // ease-in-expo
  iterations: 1,
  // composite: "add",
};

const FADE_LINE_KEY_FRAMES: Keyframe[] = [
  {
    stroke: "var(--medium-blue)",
  },
  {
    stroke: "var(--medium-blue)",
  },
  {},
];

const FADE_ANIMATION: KeyframeAnimationOptions = {
  duration: 1000,
  easing: "ease-in",
  // easing: "cubic-bezier(0.7, 0, 0.84, 0)", // ease-in-expo
  // easing: "cubic-bezier(0.5, 1.8, 0.3, 0.8)", // ease-out-elastic
  iterations: 1,
};

const FADE_STATE_KEY_FRAMES: Keyframe[] = [
  {
    "--state-color": "var(--medium-blue)",
  },
  {
    "--state-color": "var(--medium-blue)",
  },
  {},
  // {
  //   "--state-color": "var(--light-grey)",
  // },
];

interface Transition {
  readonly next: string;
  readonly data?: object;
  readonly label?: string;
}

export class TransitionController implements ReactiveController {
  host: YmChart;

  constructor(host: YmChart) {
    (this.host = host).addController(this);
  }

  hostUpdated = () => {
    // only run once
    (this as ReactiveController).hostUpdated = undefined;
  };

  #isTransitioning = false;
  #transitionQueue: Transition[] = [];

  transition(next: string, data?: object, label?: string) {
    this.#transitionQueue.push({ next: next, data, label });
    this.#scheduleNextTransition();
  }

  #scheduleNextTransition() {
    if (!this.#isTransitioning && this.#transitionQueue.length) {
      this.#isTransitioning = true;

      queueMicrotask(async () => {
        this.#doNextTransition();
        await new Promise((resolve) => setTimeout(resolve, 50));
        this.#isTransitioning = false;
        this.#scheduleNextTransition();
      });
    }
  }

  #doNextTransition() {
    const { next, data, label } = this.#transitionQueue.shift()!;
    const prev = Array.from(this.host.states ?? []).find((it) => it.current);
    if (prev) {
      prev.classList.add("animate");
      setTimeout(() => prev.classList.remove("animate"), 1000);
      // prev.animate(FADE_STATE_KEY_FRAMES, { ...FADE_ANIMATION, duration: 200 });
    }
    const prevName = this.host.current;
    this.host.current = next;
    this.host.data = data ?? this.host.data;
    let index = -1;
    let transition: YmTransition | undefined;
    const transitions = this.host.transitions ?? [];
    for (let i = 0; i < transitions.length; i++) {
      const it = transitions[i];
      if (it.from === prevName && it.to === next && it.label === label) {
        index = i;
        transition = it;
        break;
      }
    }
    if (transition) {
      transition.animate(POP_KEY_FRAMES, POP_ANIMATION);
    }

    if (index !== -1) {
      const lines = this.host.transitionLines ?? [];
      const path = lines[index];
      path
        ?.querySelector(".line")
        ?.animate(FADE_LINE_KEY_FRAMES, FADE_ANIMATION);
    } else if (next === "end") {
      const path = Array.from(this.host.transitionLines ?? []).find(
        (it) => it.dataset["from"] === prevName && it.dataset["to"] === "end",
      );
      path
        ?.querySelector(".line")
        ?.animate(FADE_LINE_KEY_FRAMES, FADE_ANIMATION);
    }

    if (this.host.end.includes(next)) {
      this.transition("end");
    }
  }
}
