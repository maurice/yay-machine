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
