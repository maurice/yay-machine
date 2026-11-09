import { createActor } from "xstate";
import type { Fixture, ThroughputSuite } from "../types";
import {
  defineXStateConnection,
  defineYayConnection,
  newConnectionCounts,
} from "../workloads/connection";
import { STREAM_TRACE } from "./stream";

// Many long-lived instances (eg a server holding one machine per client, or a
// game/IoT simulation with one per entity). Each timed op delivers the next
// event of the shared trace to every instance; instances start at staggered
// positions so they are spread across all states.

export const FLEET_SIZE = 1000;

const fleetFixture = <M>(
  create: () => M,
  send: (machine: M, event: (typeof STREAM_TRACE)[number]) => void,
  observe: (machines: readonly M[]) => unknown,
): Fixture => {
  const machines = Array.from({ length: FLEET_SIZE }, create);
  const cursors = new Int32Array(FLEET_SIZE);
  const advance = (i: number) => {
    send(machines[i]!, STREAM_TRACE[cursors[i]!]!);
    cursors[i] = (cursors[i]! + 1) % STREAM_TRACE.length;
  };
  for (let i = 0; i < FLEET_SIZE; i++) {
    const skip = (i * 7919) % STREAM_TRACE.length;
    for (let j = 0; j < skip; j++) {
      advance(i);
    }
  }
  return {
    run: () => {
      for (let i = 0; i < FLEET_SIZE; i++) {
        advance(i);
      }
    },
    observe: () => observe(machines),
  };
};

const histogram = (names: readonly unknown[]) => {
  const counts: Record<string, number> = {};
  for (const name of names) {
    counts[String(name)] = (counts[String(name)] ?? 0) + 1;
  }
  return counts;
};

export const fleet: ThroughputSuite = {
  kind: "throughput",
  id: "fleet",
  title: "Fleet: 1,000 live connections",
  category: "workload",
  description:
    "1,000 long-lived connection machines in assorted states; each op delivers one event from the realistic trace to every instance.",
  variants: [
    {
      id: "round-robin",
      label: "1 event to each of 1,000 instances",
      op: `${FLEET_SIZE} events`,
      unit: "events/s",
      unitsPerOp: FLEET_SIZE,
      setup: {
        xstate: () => {
          const counts = newConnectionCounts();
          const machine = defineXStateConnection(counts);
          return fleetFixture(
            () => createActor(machine).start(),
            (actor, event) => actor.send(event),
            (actors) => ({
              ...counts,
              states: histogram(actors.map((a) => a.getSnapshot().value)),
            }),
          );
        },
        "yay-machine": () => {
          const counts = newConnectionCounts();
          const definition = defineYayConnection(counts);
          return fleetFixture(
            () => definition.newInstance().start(),
            (machine, event) => machine.send(event),
            (machines) => ({
              ...counts,
              states: histogram(machines.map((m) => m.state.name)),
            }),
          );
        },
      },
    },
  ],
};
