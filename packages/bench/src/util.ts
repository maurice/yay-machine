import type { AnyActor } from "xstate";
import type { MachineInstance } from "yay-machine";

export const observeXState = (actor: AnyActor, extra: object = {}) => {
  const snapshot = actor.getSnapshot();
  return { state: snapshot.value, ...snapshot.context, ...extra };
};

export const observeYay = (
  // oxlint-disable-next-line no-explicit-any
  machine: MachineInstance<any, any>,
  extra: object = {},
) => {
  const { name, ...data } = machine.state;
  return { state: name, ...data, ...extra };
};

/** Small deterministic PRNG so generated event traces are reproducible */
export const mulberry32 = (seed: number) => {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
