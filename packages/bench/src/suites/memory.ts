import { type AnyActor, createActor } from "xstate";
import type { MachineInstance } from "yay-machine";
import type { MemorySuite } from "../types";
import {
  defineXStateConnection,
  defineYayConnection,
  newConnectionCounts,
} from "../workloads/connection";

const counts = newConnectionCounts();
const xstateConnection = defineXStateConnection(counts);
const yayConnection = defineYayConnection(counts);

const dispose = {
  xstate: (actor: AnyActor) => actor.stop(),
  // oxlint-disable-next-line no-explicit-any
  "yay-machine": (machine: MachineInstance<any, any>) => machine.stop(),
};

export const memory: MemorySuite = {
  kind: "memory",
  id: "memory",
  title: "Memory per live instance",
  category: "workload",
  description:
    "Retained heap per running connection machine, measured across 10,000 instances. Matters when a server holds one machine per client.",
  variants: [
    {
      id: "idle",
      label: "started, idle (disconnected)",
      instances: 10_000,
      create: {
        xstate: () => createActor(xstateConnection).start(),
        "yay-machine": () => yayConnection.newInstance().start(),
      },
      dispose,
    },
    {
      id: "connected",
      label: "connected (with heartbeat resource)",
      instances: 10_000,
      create: {
        xstate: () => {
          const actor = createActor(xstateConnection).start();
          actor.send({ type: "CONNECT" });
          actor.send({ type: "OPEN" });
          return actor;
        },
        "yay-machine": () => {
          const machine = yayConnection.newInstance().start();
          machine.send({ type: "CONNECT" });
          machine.send({ type: "OPEN" });
          return machine;
        },
      },
      dispose,
    },
  ],
};
