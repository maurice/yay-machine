import type { YmChart } from "./YmChart";
import type { YmState } from "./YmState";
import type { YmTransition } from "./YmTransition";
import type { YmViz } from "./YmViz";

export interface Point {
  readonly x: number;
  readonly y: number;
}

export type Points = readonly Point[];

export const Direction = {
  LR: "LR",
  TB: "TB",
} as const;

export type Direction = (typeof Direction)[keyof typeof Direction];

export const Align = {
  UL: "UL",
  UR: "UR",
  DL: "DL",
  DR: "DR",
} as const;

export type Align = (typeof Align)[keyof typeof Align];

export const Ranker = {
  NETWORK_SIMPLEX: "network-simplex",
  LONGEST_PATH: "longest-path",
  TIGHT_TREE: "tight-tree",
} as const;

export type Ranker = (typeof Ranker)[keyof typeof Ranker];

declare global {
  interface HTMLElementTagNameMap {
    "ym-chart": YmChart;
    "ym-state": YmState;
    "ym-transition": YmTransition;
    // biome-ignore lint/suspicious/noExplicitAny: should be fine
    "ym-viz": YmViz<any, any>;
  }
}
