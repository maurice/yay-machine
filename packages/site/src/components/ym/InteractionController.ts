import type { Edge } from "@dagrejs/dagre";
import type { ReactiveController } from "lit";
import type { LayoutController } from "./LayoutController";
import type { TransitionController } from "./TransitionController";
import type { YmChart } from "./YmChart";
import type { YmState } from "./YmState";
import type { YmTransition } from "./YmTransition";

export class InteractionController implements ReactiveController {
  host: YmChart;
  layout: LayoutController;
  transitions: TransitionController;
  lineToHit: Map<SVGPathElement, SVGPathElement> = new Map();
  hitToLine: Map<SVGPathElement, SVGPathElement> = new Map();
  lineToTransition: Map<SVGPathElement, YmTransition> = new Map();
  transitionToLine: Map<YmTransition, SVGPathElement> = new Map();
  transitionToState: Map<YmTransition, YmState> = new Map();
  stateToTransitions: Map<YmState, readonly YmTransition[]> = new Map();
  didAddEventListeners = false;
  outEdges: Edge[] | undefined;

  constructor(
    host: YmChart,
    layout: LayoutController,
    transitions: TransitionController,
  ) {
    (this.host = host).addController(this);
    this.layout = layout;
    this.transitions = transitions;
  }

  hostUpdated() {
    const states = Array.from(this.host.querySelectorAll("ym-state"));
    const transitions = Array.from(this.host.querySelectorAll("ym-transition"));
    const lines =
      this.host.renderRoot.querySelectorAll<SVGPathElement>(".transition-line");

    if (this.host.interactive && !this.didAddEventListeners) {
      for (const state of states) {
        state.addEventListener("mouseover", this.#onMouseOverState);
        state.addEventListener("mouseout", this.#onMouseOutState);
        state.addEventListener("click", this.#onClickState);
        this.stateToTransitions.set(
          state,
          transitions.filter((it) => it.to === state.name),
        );
      }

      for (let i = 0; i < transitions.length; i++) {
        const transition = transitions[i];
        transition.addEventListener("mouseover", this.#onMouseOverTransition);
        transition.addEventListener("mouseout", this.#onMouseOutTransition);
        transition.addEventListener("click", this.#onClickTransition);

        const [hit, line] = lines[i].getElementsByTagName("path");
        hit.addEventListener("mouseover", this.#onMouseOverTransitionLine);
        hit.addEventListener("mouseout", this.#onMouseOutTransitionLine);
        hit.addEventListener("click", this.#onClickTransitionLine);

        this.lineToHit.set(line, hit);
        this.hitToLine.set(hit, line);
        this.transitionToLine.set(transition, line);
        this.lineToTransition.set(line, transition);
        this.transitionToState.set(
          transition,
          states.find((it) => it.name === transition.to)!,
        );
      }

      this.didAddEventListeners = true;
    }

    if (this.host.current && this.layout.graph) {
      this.outEdges = this.layout.graph.outEdges(this.host.current);
    }

    if (this.host.current && this.outEdges) {
      const toStates = new Set(this.outEdges.map((it) => it.w));
      for (const state of states) {
        state.next = toStates.has(state.name);
      }

      for (let i = 0; i < transitions.length; i++) {
        const transition = transitions[i];
        const line = lines[i];

        const isNext = !!this.outEdges.find(
          (it) =>
            it.v === transition.from &&
            it.w === transition.to &&
            it.name === transition.label,
        );
        if (isNext) {
          transition.classList.add("next");
          line.classList.add("next");
        } else {
          transition.classList.remove("next");
          line.classList.remove("next");
        }
      }
    }

    if (this.host.current === "end") {
      const end = this.host.renderRoot.querySelector<SVGGElement>(".end-node")!;
      end.classList.add("reached");
    }
  }

  #onMouseOverState = (event: MouseEvent) => {
    const state = event.target as YmState;
    if (!this.#canTransitionTo(state)) {
      return;
    }

    this.#stateHovered(state);
  };

  #stateHovered(state: YmState) {
    state.classList.add("hovered");
    const transitions = this.stateToTransitions.get(state)!;
    for (const transition of transitions) {
      if (this.#canTakeTransition(transition)) {
        this.#transitionHovered(transition);
      }
    }
  }

  #onMouseOutState = (event: MouseEvent) => {
    const state = event.target as YmState;
    if (!this.#canTransitionTo(state)) {
      return;
    }

    this.#stateUnHovered(state);
  };

  #stateUnHovered(state: YmState) {
    state.classList.remove("hovered");
    const transitions = this.stateToTransitions.get(state)!;
    for (const transition of transitions) {
      if (this.#canTakeTransition(transition)) {
        this.#transitionUnHovered(transition);
      }
    }
  }

  #onClickState = (event: MouseEvent) => {
    const state = event.target as YmState;
    if (!this.#canTransitionTo(state)) {
      return;
    }

    this.#stateUnHovered(state);
    const transition = this.stateToTransitions.get(state)![0];
    this.transitions.transition(transition.to, undefined, transition.label);
  };

  #onMouseOverTransition = (event: MouseEvent) => {
    const transition = event.target as YmTransition;
    if (!this.#canTakeTransition(transition)) {
      return;
    }

    this.#transitionHovered(transition);
  };

  #transitionHovered(transition: YmTransition) {
    transition.classList.add("hovered");
    this.transitionToLine.get(transition)?.classList.add("hovered");
    this.transitionToState.get(transition)?.classList.add("hovered");
  }

  #onMouseOutTransition = (event: MouseEvent) => {
    const transition = event.target as YmTransition;
    this.#transitionUnHovered(transition);
  };

  #transitionUnHovered(transition: YmTransition) {
    transition.classList.remove("hovered");
    this.transitionToLine.get(transition)?.classList.remove("hovered");
    this.transitionToState.get(transition)?.classList.remove("hovered");
  }

  #onClickTransition = (event: MouseEvent) => {
    const transition = event.target as YmTransition;
    if (!this.#canTakeTransition(transition)) {
      return;
    }

    this.#transitionUnHovered(transition);
    this.transitions.transition(transition.to, undefined, transition.label);
  };

  #onMouseOverTransitionLine = (event: MouseEvent) => {
    const path = event.target as SVGPathElement;
    const line = this.hitToLine.get(path)!;
    const transition = this.lineToTransition.get(line)!;
    if (!this.#canTakeTransition(transition)) {
      return;
    }

    this.#transitionLineHovered(line, transition);
  };

  #transitionLineHovered(path: SVGPathElement, transition: YmTransition) {
    path.classList.add("hovered");
    transition.classList.add("hovered");
    this.transitionToState.get(transition)?.classList.add("hovered");
  }

  #onMouseOutTransitionLine = (event: MouseEvent) => {
    const path = event.target as SVGPathElement;
    const line = this.hitToLine.get(path)!;
    this.#transitionLineUnHovered(line);
  };

  #transitionLineUnHovered(path: SVGPathElement) {
    path.classList.remove("hovered");
    const transition = this.lineToTransition.get(path)!;
    transition.classList.remove("hovered");
    this.transitionToState.get(transition)?.classList.remove("hovered");
  }

  #onClickTransitionLine = (event: MouseEvent) => {
    const path = event.target as SVGPathElement;
    const line = this.hitToLine.get(path)!;
    const transition = this.lineToTransition.get(line)!;
    if (!this.#canTakeTransition(transition)) {
      return;
    }

    this.#transitionLineUnHovered(line);
    this.transitions.transition(transition.to, undefined, transition.label);
  };

  #canTakeTransition(transition: YmTransition) {
    return (
      this.outEdges &&
      !!this.outEdges.find(
        (it) =>
          it.v === transition.from &&
          it.w === transition.to &&
          it.name === transition.label,
      )
    );
  }

  #canTransitionTo(state: YmState) {
    return (
      this.outEdges &&
      !!this.outEdges?.find(
        (it) => it.v === this.host.current && it.w === state.name,
      )
    );
  }
}
