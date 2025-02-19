import dagre, { type graphlib } from "@dagrejs/dagre";
import { curveBasis, line } from "d3-shape";
import { LitElement, css, html, nothing, svg } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { Direction, type Point, type Points } from "./types";

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

@customElement("ym-chart")
class YmChart extends LitElement {
  static styles = css`
  .background {
    width: 100%;
    height: 100%;
    background: white;
    position: relative;
    box-shadow: 0px 0px 4px 0px white;
    border-radius: 5px;
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
      background-image: linear-gradient(to right, #f2f2f28c 1px, transparent 1px),
        linear-gradient(to bottom, #f2f2f28c 1px, transparent 1px);
      background-position: center;
      top: 0;
      left: 0;
    }

    background-size: 50px 50px;
    background-image: linear-gradient(to right, #d1d1d18c 1px, transparent 1px),
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

    .chart {
      position: relative;
      margin: 0 auto;
    }

    .chart.interactive {
      --chart-color: var(--medium-grey);
    }

    #arrow {
      fill: var(--chart-color);
    }

    .transition-line {
      fill: none;
      stroke: var(--chart-color);
      stroke-width: 2px;
      marker-end: url(#arrow);
    }
  }
  `;

  @property({ type: String })
  start: string | undefined;

  #current: string | undefined;

  @property({
    type: String,
    hasChanged() {
      return true;
    },
  })
  get current(): string | undefined {
    return this.#current;
  }

  set current(current: string | undefined) {
    this.#current = current;
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

  @state()
  graph: graphlib.Graph | undefined;

  @state()
  clippedPaths: [] | undefined;

  #prevCurrent: string | undefined;

  render() {
    requestAnimationFrame(() => {
      if (!this.graph) {
        this.#layout();
      }
      for (const state of this.querySelectorAll("ym-state")) {
        state.interactive = !!this.current;
        state.current = this.current === state.name;
        if (this.#prevCurrent && this.current === state.name) {
          // const el = state.renderRoot.querySelector("div.state") as HTMLDivElement;
          state.animate(
            [
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
            ],
            {
              duration: 500,
              easing: "cubic-bezier(0.5, 1.8, 0.3, 0.8)", // ease-out-elastic
              iterations: 1,
            },
          );
        }
      }
      this.#prevCurrent = this.current;
    });

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
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" />
                  </marker>
                  <marker
                      id="hover-arrow"
                      viewBox="0 0 10 10"
                      refX="5"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" />
                  </marker>
              </defs>
              ${this.start ? svg`<circle class='start-node' r="10" cx=${this.graph?.node("start")?.x || 0} cy=${this.graph?.node("start").y || 0} />` : nothing}
              ${Array.from(this.querySelectorAll("ym-transition")).map?.(() => svg`<path class="transition-line" shape-rendering="auto" />`)}
              ${this.start ? svg`<path class="transition-line" shape-rendering="auto" />` : nothing}
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
      nodesep: 100,
      edgesep: 30,
      rankdir: this.direction === Direction.LR ? "LR" : "TB",
      marginy: 16,
    });

    for (const state of this.querySelectorAll("ym-state")) {
      const rect = state.getBoundingClientRect();
      g.setNode(state.name, { label: state.name, width: rect.width, height: rect.height });
    }
    const start = this.renderRoot.querySelector(".start-node");
    if (start) {
      const rect = start.getBoundingClientRect();
      g.setNode("start", { label: "start", width: rect.width, height: rect.height });
    }

    for (const transition of this.querySelectorAll("ym-transition")) {
      const rect = transition.getBoundingClientRect();
      g.setEdge(
        transition.from,
        transition.to,
        { label: transition.label, width: rect.width, height: rect.height, labelpos: "c" },
        `${transition.from}:${transition.to}:${transition.label}`,
      );
    }
    if (this.start) {
      g.setEdge("start", this.start, { label: undefined, labelpos: "c" });
    }

    dagre.layout(g);

    this.graph = g;

    for (const state of this.querySelectorAll("ym-state")) {
      const node = g.node(state.name);
      state.style.top = `${node.y - node.height / 2}px`;
      state.style.left = `${node.x - node.width / 2}px`;
    }

    const edges = g.edges();
    const transitions = Array.from(this.querySelectorAll("ym-transition"));
    const lines = Array.from(this.renderRoot.querySelectorAll(".transition-line"));
    for (let i = 0; i < transitions.length; i++) {
      const transition = transitions[i];
      const edge = g.edge(edges[i]);
      transition.style.top = `${edge.y - edge.height / 2}px`;
      transition.style.left = `${edge.x - edge.width / 2}px`;
      const line = lines[i] as SVGPathElement;
      line.setAttribute("d", drawCurve(edge.points));
      clipPath(line, edge.points);
    }

    if (this.start) {
      const edge = g.edge(edges[edges.length - 1]);
      const line = lines[lines.length - 1] as SVGPathElement;
      line.setAttribute("d", drawCurve(edge.points));
      clipPath(line, edge.points);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ym-chart": YmChart;
  }
}
