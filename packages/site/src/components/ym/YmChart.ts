import { LitElement, type PropertyValues, css, html, svg } from "lit";
import {
  customElement,
  property,
  query,
  queryAll,
  queryAssignedElements,
} from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { InteractionController } from "./InteractionController";
import { LayoutController } from "./LayoutController";
import { TransitionController } from "./TransitionController";
import type { YmState } from "./YmState";
import type { YmTransition } from "./YmTransition";
import { Align, Direction, Ranker } from "./types";

@customElement("ym-chart")
export class YmChart extends LitElement {
  static styles = css`
    :host {
      display: block;
      --dark-grey: #333;
      --medium-grey: #666;
      --light-grey: #aaa;
      --medium-blue: royalblue;
      --light-blue: #75bcff;

      --chart-color: var(--dark-grey);
    }

    :host([current]) {
      --chart-color: var(--light-grey);
    }

    /* :host([interactive]) {
      --chart-color: var(--light-grey);
    } */

    .background {
      width: 100%;
      height: 100%;
      background: white;
      position: relative;
      box-shadow: 0px 0px 4px 0px white;
    }

    .container {
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

        g.end-node,
        circle,
        path.hit-area {
          pointer-events: stroke;
        }
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

      .end-node.reached {
        circle:nth-child(1) {
          stroke: var(--dark-grey);
        }
        circle:nth-child(2) {
          stroke: none;
          fill: var(--dark-grey);
        }
      }

      .chart {
        position: relative;
        margin: 0 auto;
      }

      .transition-line {
        .line {
          fill: none;
          stroke: var(--chart-color);
          stroke-width: 2px;
          marker-end: url(#arrow);
          transition: 100ms stroke;
        }

        .hit-area {
          fill: none;
          stroke: transparent;
          stroke-width: 18px;
          cursor: pointer;
        }

        &.next .line {
          stroke: var(--dark-grey);
        }

        .line.hovered {
          cursor: pointer;
          stroke: var(--light-blue);
        }
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
  end: readonly string[] = [];

  @property({ type: String, reflect: true })
  current: string | undefined;

  @property({ type: Object })
  data: object | undefined;

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

  @property({ type: Number })
  nodesep: number | undefined;

  @property({ type: Number })
  edgesep: number | undefined;

  @property({ type: Boolean })
  interactive = false;

  @queryAssignedElements({ selector: "ym-state" })
  states: NodeListOf<YmState> | undefined;

  @queryAssignedElements({ selector: "ym-transition" })
  transitions: NodeListOf<YmTransition> | undefined;

  @queryAll("g.transition-line")
  transitionLines: NodeListOf<SVGGElement> | undefined;

  @query(".start-node")
  startNode: SVGCircleElement | undefined;

  @query(".end-node")
  endNode: SVGGElement | undefined;

  #layout: LayoutController;
  #transitions: TransitionController;

  constructor() {
    super();

    this.#layout = new LayoutController(this);
    this.#transitions = new TransitionController(this);
    new InteractionController(this, this.#layout, this.#transitions);
  }

  transition(next: string, data?: object, label?: string) {
    this.#transitions.transition(next, data, label);
  }

  protected firstUpdated(): void {
    this.#syncChildren();
  }

  protected willUpdate(changedProperties: PropertyValues<this>): void {
    if (changedProperties.has("current") || changedProperties.has("data")) {
      this.#syncChildren();
    }
  }

  render() {
    const transitions = this.querySelectorAll("ym-transition");

    return html`
      <div class="background">
        <div class="container">
          <div class=${classMap({ chart: true, interactive: !!this.current })} style="height: ${this.#layout.height}px; width: ${this.#layout.width}px">
            <slot></slot>
            <svg
                style={{ position: "absolute", top: "0px", left: "0px" }}
                width=${this.#layout.width}
                height=${this.#layout.height}
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
                      stroke="none"
                      fill="context-stroke"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 Z" />
                  </marker>
              </defs>
              ${this.start && svg`<circle class='start-node' r="10" cx=${this.#layout.startCx} cy=${this.#layout.startCy} />`}
              ${
                this.end.length &&
                svg`<g class='end-node'>
                <circle r="10" cx=${this.#layout.endCx} cy=${this.#layout.endCy} />
                <circle r="6" cx=${this.#layout.endCx} cy=${this.#layout.endCy} />
                </g>`
              }
              ${Array.from(transitions).map(
                () =>
                  svg`<g class="transition-line"><path class="hit-area"/><path class="line"/></g>`,
              )}
              ${this.start && svg`<g class="transition-line"><path class="hit-area"/><path class="line"/></g>`}
              ${this.end.length && svg`${this.end.map((from) => svg`<g class="transition-line" data-from=${from} data-to="end"><path class="hit-area"/><path class="line"/></g>`)}`}
            </svg>
          </div>
        </div>
      </div>
    `;
  }

  #syncChildren() {
    const states = this.states ?? [];
    for (const state of states) {
      state.interactive = !!this.current;
      state.current = this.current === state.name;
      state.data = this.current === state.name ? this.data : undefined;
    }

    const transitions = this.transitions ?? [];
    for (const transition of transitions) {
      transition.interactive = !!this.current;
    }
  }
}
