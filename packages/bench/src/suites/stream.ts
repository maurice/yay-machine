import { createActor } from "xstate";
import type { ThroughputSuite } from "../types";
import { observeXState, observeYay } from "../util";
import {
  defineXStateConnection,
  defineYayConnection,
  generateConnectionTrace,
  newConnectionCounts,
} from "../workloads/connection";

export const STREAM_TRACE = generateConnectionTrace(1000);

export const stream: ThroughputSuite = {
  kind: "throughput",
  id: "stream",
  title: "Event stream: long-lived connection",
  category: "workload",
  description:
    "One long-lived connection machine replaying a realistic, mixed 1,000-event trace: sends, heartbeats, errors, reconnects (with resource cleanup) and stray events that are ignored.",
  variants: [
    {
      id: "trace",
      label: `replay ${STREAM_TRACE.length.toLocaleString("en-US")}-event trace`,
      op: `${STREAM_TRACE.length} events`,
      unit: "events/s",
      unitsPerOp: STREAM_TRACE.length,
      setup: {
        xstate: () => {
          const counts = newConnectionCounts();
          const actor = createActor(defineXStateConnection(counts)).start();
          return {
            run: () => {
              for (const event of STREAM_TRACE) {
                actor.send(event);
              }
            },
            observe: () => observeXState(actor, counts),
          };
        },
        "yay-machine": () => {
          const counts = newConnectionCounts();
          const machine = defineYayConnection(counts).newInstance().start();
          return {
            run: () => {
              for (const event of STREAM_TRACE) {
                machine.send(event);
              }
            },
            observe: () => observeYay(machine, counts),
          };
        },
      },
    },
  ],
};
