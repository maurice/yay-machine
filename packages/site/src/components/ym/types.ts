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
