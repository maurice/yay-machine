import dagre, { type graphlib } from "@dagrejs/dagre";
import { curveBasis, line } from "d3-shape";
import type { ReactiveController } from "lit";
import type { YmChart } from "./YmChart";
import { Align, Direction, type Point, type Points, Ranker } from "./types";

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

export class LayoutController implements ReactiveController {
  host: YmChart;
  graph: graphlib.Graph | undefined;
  resizeObserver: ResizeObserver = new ResizeObserver(() =>
    this.#invalidateLayout(),
  );

  get width() {
    return this.graph?.graph()?.width ?? 0;
  }

  get height() {
    return this.graph?.graph()?.height ?? 0;
  }

  get startCx() {
    return this.graph?.node("start")?.x ?? 0;
  }

  get startCy() {
    return this.graph?.node("start")?.y ?? 0;
  }

  get endCx() {
    return this.graph?.node("end")?.x ?? 0;
  }

  get endCy() {
    return this.graph?.node("end")?.y ?? 0;
  }

  constructor(host: YmChart) {
    (this.host = host).addController(this);
  }

  hostUpdated = () => {
    // only run once
    (this as ReactiveController).hostUpdated = undefined;

    // invalidate layout on state element resize
    const states = this.host.querySelectorAll("ym-state");
    for (const state of states) {
      this.resizeObserver.observe(state);
    }

    requestAnimationFrame(() => this.#layout());
  };

  #layout() {
    // build graph
    const states = this.host.querySelectorAll("ym-state");
    const transitions = this.host.querySelectorAll("ym-transition");

    const g = (this.graph = new dagre.graphlib.Graph({
      multigraph: true,
      directed: true,
    }));
    g.setGraph({
      // nodesep: 100,
      // edgesep: 30,
      rankdir: this.host.direction,
      align: this.host.align,
      ranker: this.host.ranker,
      marginy: 16,
    });

    for (const state of states) {
      const rect = state.getBoundingClientRect();
      g.setNode(state.name, {
        label: state.name,
        width: rect.width,
        height: rect.height,
      });
    }

    const start = this.host.renderRoot.querySelector(".start-node");
    if (start) {
      const rect = start.getBoundingClientRect();
      g.setNode("start", {
        label: "start",
        width: rect.width,
        height: rect.height,
      });
    }

    const end = this.host.renderRoot.querySelector(".end-node");
    if (end) {
      const rect = end.getBoundingClientRect();
      g.setNode("end", {
        label: "end",
        width: rect.width,
        height: rect.height,
      });
    }

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
        transition.label,
      );
    }

    if (this.host.start) {
      g.setEdge(
        "start",
        this.host.start,
        { label: undefined, labelpos: "c" },
        "start",
      );
    }

    for (const fromState of this.host.end) {
      g.setEdge(
        fromState,
        "end",
        { label: undefined, labelpos: "c" },
        `${fromState}:end`,
      );
    }

    dagre.layout(g);

    for (const state of states) {
      const node = g.node(state.name);
      state.style.top = `${node.y - node.height / 2}px`;
      state.style.left = `${node.x - node.width / 2}px`;
    }

    const edges = g.edges();
    const lines = Array.from(
      this.host.renderRoot.querySelectorAll<SVGPathElement>(".transition-line"),
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
        const line = lines[i];
        line.setAttribute("d", drawCurve(edge.points));
        clipPath(line, edge.points);
      }
    }

    if (this.host.start) {
      const edge = g.edge(edges[i++]);
      if (
        edge.points.every((it) => !Number.isNaN(it.x) && !Number.isNaN(it.y))
      ) {
        const line = lines[i - 1] as SVGPathElement;
        line.setAttribute("d", drawCurve(edge.points));
        clipPath(line, edge.points);
      }
    }

    for (const fromState of this.host.end) {
      const edge = g.edge(edges[i++]);
      if (
        edge.points.every((it) => !Number.isNaN(it.x) && !Number.isNaN(it.y))
      ) {
        const line = lines[i - 1] as SVGPathElement;
        line.setAttribute("d", drawCurve(edge.points));
        clipPath(line, edge.points);
      }
    }

    this.host.requestUpdate();
  }

  #invalidateLayout() {
    // we might be able to surgically update just the graph nodes whose corresponding elements resized here?
    this.#layout();
  }
}
