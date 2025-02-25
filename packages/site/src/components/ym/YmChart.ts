import dagre, { type graphlib } from "@dagrejs/dagre";
import { curveBasis, line } from "d3-shape";
import deepEqual from "fast-deep-equal";
import { LitElement, css, html, nothing, svg } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import type { YmTransition } from "./YmTransition";
import { Align, Direction, type Point, type Points, Ranker } from "./types";

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
  {
    transform: "rotate(-2deg)",
  },
  {
    transform: "rotate(0deg)",
  },
];

const WIGGLE_RIGHT_KEY_FRAMES: Keyframe[] =
  WIGGLE_LEFT_KEY_FRAMES.concat().reverse();

const WIGGLE_ANIMATION: KeyframeAnimationOptions = {
  duration: 500,
  easing: "cubic-bezier(0.5, 1.8, 0.3, 0.8)", // ease-out-elastic
  iterations: 1,
};

const curveDrawer = line<Point>()
  .x((p) => p.x)
  .y((p) => p.y)
  .curve(curveBasis);

const drawCurve = (p: Points | undefined) => (p && curveDrawer(p)) || "";

const clipPath = (path: SVGPathElement, points: Points) => {
  const length = path.getTotalLength();
  const end = path.getPointAtLength(length - 5);
  const newPoints = [...points.slice(0, -1), end];
  path.setAttribute("d", drawCurve(newPoints));
};

interface Transition {
  readonly next: string;
  readonly data?: object;
  readonly label?: string;
}

@customElement("ym-chart")
export class YmChart extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .background {
      width: 100%;
      height: 100%;
      background: white;
      position: relative;
      box-shadow: 0px 0px 4px 0px white;
    }

    .container {
      --dark-grey: #333;
      --medium-grey: #666;
      --medium-blue: royalblue;

      --chart-color: var(--dark-grey);

      color: var(--chart-color);
      position: relative;

      &:before {
        content: "";
        position: absolute;
        height: 100%;
        width: 100%;
        background-size: 10px 10px;
        background-image:
          linear-gradient(to right, #f2f2f28c 1px, transparent 1px),
          linear-gradient(to bottom, #f2f2f28c 1px, transparent 1px);
        background-position: center;
        top: 0;
        left: 0;
      }

      background-size: 50px 50px;
      background-image:
        linear-gradient(to right, #d1d1d18c 1px, transparent 1px),
        linear-gradient(to bottom, #d1d1d18c 1px, transparent 1px);
      background-position: center;

      svg {
        position: absolute;
        top: 0;
        left: 0;
        pointer-events: none;
        z-index: 1;
      }

      .start-node {
        fill: var(--chart-color);
      }

      .end-node {
        circle:nth-child(1) {
          stroke: var(--chart-color);
          stroke-width: 2;
          fill: #f9f9f9;
        }
        circle:nth-child(2) {
          stroke: none;
          fill: var(--chart-color);
        }
      }

      .chart {
        position: relative;
        margin: 0 auto;
      }

      .chart.interactive {
        --chart-color: var(--medium-grey);
      }

      .transition-line {
        fill: var(--chart-color);
        fill-opacity: 0;
        stroke: var(--chart-color);
        stroke-width: 2px;
        marker-end: url(#arrow);
      }
    }
  `;

  @property({ type: String })
  start: string | undefined;

  @property({
    type: Array,
    converter(value) {
      return String(value)
        .split(",")
        .map((it) => it.trim());
    },
  })
  end: string[] = [];

  hasEnd(): boolean {
    return this.end.length > 0;
  }

  #previousCurrent: string | undefined;
  #current: string | undefined;

  @property({ type: String })
  get current(): string | undefined {
    return this.#current;
  }

  set current(current: string | undefined) {
    this.#previousCurrent = this.#current;
    this.#current = current;
  }

  #previousData: object | undefined;
  #data: object | undefined;

  @property({ type: Object })
  get data(): object | undefined {
    return this.#data;
  }

  set data(data: object | undefined) {
    this.#previousData = this.#data;
    this.#data = data;
  }

  @property({
    type: String,
    converter(value) {
      switch (value) {
        case Direction.LR:
        case Direction.TB:
          return value;

        default:
          return Direction.TB;
      }
    },
  })
  direction: Direction = Direction.TB;

  @property({
    type: String,
    converter(value) {
      switch (value) {
        case Align.UL:
        case Align.UR:
        case Align.DL:
        case Align.DR:
          return value;

        default:
          return undefined;
      }
    },
  })
  align: Align | undefined;

  @property({
    type: String,
    converter(value) {
      switch (value) {
        case Ranker.NETWORK_SIMPLEX:
        case Ranker.LONGEST_PATH:
        case Ranker.TIGHT_TREE:
          return value;

        default:
          return undefined;
      }
    },
  })
  ranker: Ranker | undefined;

  @state()
  graph: graphlib.Graph | undefined;

  @state()
  clippedPaths: [] | undefined;

  #resizeObserver: ResizeObserver = new ResizeObserver((entries) => {
    this.#invalidateLayout();
  });

  #isTransitioning = false;
  #transitionQueue: Transition[] = [];

  transition(next: string, data?: object, label?: string) {
    this.#transitionQueue.push({ next: next, data, label });
    this.#scheduleNextTransition();
  }

  #scheduleNextTransition() {
    if (!this.#isTransitioning && this.#transitionQueue.length) {
      this.#isTransitioning = true;

      queueMicrotask(() => {
        this.#doNextTransition();
        this.#isTransitioning = false;
        this.#scheduleNextTransition();
      });
    }
  }

  #doNextTransition() {
    // biome-ignore lint/style/noNonNullAssertion: OK
    const { next, data, label } = this.#transitionQueue.shift()!;
    const prev = this.current;
    this.current = next;
    this.data = data ?? this.data;
    if (label) {
      let index = -1;
      let transition: YmTransition | undefined;
      const transitions = this.querySelectorAll("ym-transition");
      for (let i = 0; transitions.length; i++) {
        const it = transitions.item(i);
        if (it.from === prev && it.to === next && it.label === label) {
          index = i;
          transition = it;
          break;
        }
      }
      if (transition) {
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

        transition.animate(POP_KEY_FRAMES, POP_ANIMATION);
      }

      if (index !== -1) {
        const lines = this.renderRoot.querySelectorAll("path.transition-line");
        const path = lines.item(index);
        if (path) {
          const FADE_KEY_FRAMES: Keyframe[] = [
            {
              fill: "var(--medium-blue)",
              stroke: "var(--medium-blue)",
            },
            {
              fill: "var(--medium-blue)",
              stroke: "var(--medium-blue)",
            },
            {},
          ];

          const FADE_ANIMATION: KeyframeAnimationOptions = {
            duration: 300,
            easing: "ease-in",
            // easing: "cubic-bezier(0.7, 0, 0.84, 0)", // ease-in-expo
            // easing: "cubic-bezier(0.5, 1.8, 0.3, 0.8)", // ease-out-elastic
            iterations: 1,
          };

          path.animate(FADE_KEY_FRAMES, FADE_ANIMATION);
        }
      }
    }
  }

  render() {
    if (!this.graph) {
      requestAnimationFrame(() => {
        this.#layout();
      });
    }

    for (const state of this.querySelectorAll("ym-state")) {
      state.interactive = !!this.current;
      state.current = this.current === state.name;
      state.data = this.current === state.name ? this.data : undefined;
      if (
        state.name === this.current &&
        this.#previousCurrent &&
        (this.#previousCurrent !== this.current ||
          !deepEqual(this.#previousData, this.#data))
      ) {
        state.animate(
          Math.random() < 0.6
            ? WIGGLE_LEFT_KEY_FRAMES
            : WIGGLE_RIGHT_KEY_FRAMES,
          WIGGLE_ANIMATION,
        );
      }
    }
    this.#previousCurrent = this.#current;
    this.#previousData = this.#data;

    return html`
      <div class="background">
        <div class="container">
          <div class=${classMap({ chart: true, interactive: !!this.current })} style="height: ${this.graph?.graph().height}px; width: ${this.graph?.graph().width}px">
            <svg
                style={{ position: "absolute", top: "0px", left: "0px" }}
                width=${this.graph?.graph()?.width ?? 0}
                height=${this.graph?.graph()?.height ?? 0}
                xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                  <marker
                      id="arrow"
                      viewBox="0 0 10 10"
                      refX="5"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                      stroke="context-stroke"
                      fill="context-fill"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" />
                  </marker>
              </defs>
              ${this.start && svg`<circle class='start-node' r="10" cx=${this.graph?.node("start")?.x ?? 0} cy=${this.graph?.node("start").y ?? 0} />`}
              ${
                this.hasEnd() &&
                svg`<g class='end-node'>
                <circle r="10" cx=${this.graph?.node("end")?.x ?? 0} cy=${this.graph?.node("end").y ?? 0} />
                <circle r="6" cx=${this.graph?.node("end")?.x ?? 0} cy=${this.graph?.node("end").y ?? 0} />
                </g>`
              }
              ${Array.from(this.querySelectorAll("ym-transition")).map?.(() => svg`<path class="transition-line" shape-rendering="auto" />`)}
              ${this.start && svg`<path class="transition-line" shape-rendering="auto" />`}
              ${this.hasEnd() && svg`${this.end.map(() => svg`<path class="transition-line" shape-rendering="auto" />`)}`}
            </svg>
            <slot></slot>
          </div>
        </div>
      </div>
    `;
  }

  #layout() {
    const g = new dagre.graphlib.Graph({ multigraph: true, directed: true });
    g.setGraph({
      // nodesep: 100,
      // edgesep: 30,
      rankdir: this.direction,
      align: this.align,
      ranker: this.ranker,
      marginy: 16,
    });

    const states = this.querySelectorAll("ym-state");
    for (const state of states) {
      const rect = state.getBoundingClientRect();
      g.setNode(state.name, {
        label: state.name,
        width: rect.width,
        height: rect.height,
      });
    }

    const start = this.renderRoot.querySelector(".start-node");
    if (start) {
      const rect = start.getBoundingClientRect();
      g.setNode("start", {
        label: "start",
        width: rect.width,
        height: rect.height,
      });
    }

    const end = this.renderRoot.querySelector(".end-node");
    if (end) {
      const rect = end.getBoundingClientRect();
      g.setNode("end", {
        label: "end",
        width: rect.width,
        height: rect.height,
      });
    }

    const transitions = this.querySelectorAll("ym-transition");
    for (const transition of transitions) {
      const rect = transition.getBoundingClientRect();
      g.setEdge(
        transition.from,
        transition.to,
        {
          label: transition.label,
          width: rect.width,
          height: rect.height,
          labelpos: "c",
        },
        `${transition.from}:${transition.to}:${transition.label}`,
      );
    }

    if (this.start) {
      g.setEdge(
        "start",
        this.start,
        { label: undefined, labelpos: "c" },
        "start",
      );
    }

    if (this.end) {
      for (const fromState of this.end) {
        g.setEdge(
          fromState,
          "end",
          { label: undefined, labelpos: "c" },
          `${fromState}:end`,
        );
      }
    }

    dagre.layout(g);

    if (!this.graph) {
      for (const state of states) {
        this.#resizeObserver.observe(state);
      }
    }
    this.graph = g;

    for (const state of states) {
      const node = g.node(state.name);
      state.style.top = `${node.y - node.height / 2}px`;
      state.style.left = `${node.x - node.width / 2}px`;
    }

    const edges = g.edges();
    const lines = Array.from(
      this.renderRoot.querySelectorAll(".transition-line"),
    );
    let i = 0;
    for (; i < transitions.length; i++) {
      const transition = transitions.item(i);
      const edge = g.edge(edges[i]);
      transition.style.top = `${edge.y - edge.height / 2}px`;
      transition.style.left = `${edge.x - edge.width / 2}px`;
      if (
        edge.points.every((it) => !Number.isNaN(it.x) && !Number.isNaN(it.y))
      ) {
        const line = lines[i] as SVGPathElement;
        line.setAttribute("d", drawCurve(edge.points));
        clipPath(line, edge.points);
      }
    }

    if (this.start) {
      const edge = g.edge(edges[i++]);
      if (
        edge.points.every((it) => !Number.isNaN(it.x) && !Number.isNaN(it.y))
      ) {
        const line = lines[i - 1] as SVGPathElement;
        line.setAttribute("d", drawCurve(edge.points));
        clipPath(line, edge.points);
      }
    }

    if (this.end) {
      const edge = g.edge(edges[i++]);
      if (
        edge.points.every((it) => !Number.isNaN(it.x) && !Number.isNaN(it.y))
      ) {
        const line = lines[i - 1] as SVGPathElement;
        line.setAttribute("d", drawCurve(edge.points));
        clipPath(line, edge.points);
      }
    }
  }

  #invalidateLayout() {
    const stateEl = this.querySelector("ym-state");
    if (findParentWithDisplayNone(stateEl)) {
      return;
    }
    this.#layout();
  }
}

function findParentWithDisplayNone(initialElement: HTMLElement | null) {
  let element: HTMLElement | null = initialElement;
  while (element && element !== document.body) {
    if (window.getComputedStyle(element).display === "none") {
      return element;
    }
    element = element.parentElement;
  }
  return null;
}
