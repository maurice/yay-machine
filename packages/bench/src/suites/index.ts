import type { Suite } from "../types";
import { always } from "./always";
import { complex } from "./complex";
import { counter } from "./counter";
import { defaultHandling } from "./defaultHandling";
import { effects } from "./effects";
import { fleet } from "./fleet";
import { form } from "./form";
import { guards } from "./guards";
import { lifecycle } from "./lifecycle";
import { memory } from "./memory";
import { multiInstance } from "./multiInstance";
import { stream } from "./stream";
import { toggle } from "./toggle";

export const suites: readonly Suite[] = [
  // realistic workloads
  form,
  stream,
  fleet,
  complex,
  memory,
  // feature micro-benchmarks
  toggle,
  counter,
  guards,
  always,
  defaultHandling,
  effects,
  lifecycle,
  multiInstance,
];
