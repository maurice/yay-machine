import { describe, expect, test } from "bun:test";
import { suites } from "../suites";
import { STREAM_TRACE } from "../suites/stream";
import { libraries } from "../types";

// Benchmarks are only meaningful if both libraries do the same work.
// Every variant must produce identical observable outcomes (state, data,
// effect and cleanup counts) for xstate and yay-machine.

describe("benchmark equivalence", () => {
  for (const suite of suites) {
    if (suite.kind !== "throughput") {
      continue;
    }
    for (const variant of suite.variants) {
      test(`${suite.id} / ${variant.id}`, () => {
        const xstate = variant.setup.xstate();
        const yay = variant.setup["yay-machine"]();
        expect(yay.observe()).toEqual(xstate.observe() as never);
        for (let i = 0; i < 3; i++) {
          xstate.run();
          yay.run();
          expect(yay.observe()).toEqual(xstate.observe() as never);
        }
      });
    }
  }

  test("memory suite creates and disposes instances", () => {
    const memory = suites.find((suite) => suite.kind === "memory");
    if (memory?.kind !== "memory") {
      throw new Error("missing memory suite");
    }
    for (const variant of memory.variants) {
      for (const library of libraries) {
        const instance = variant.create[library]();
        variant.dispose[library](instance as never);
      }
    }
  });

  test("connection trace is realistic and replayable", () => {
    const counts: Record<string, number> = {};
    for (const event of STREAM_TRACE) {
      counts[event.type] = (counts[event.type] ?? 0) + 1;
    }
    expect(STREAM_TRACE).toHaveLength(1000);
    expect(STREAM_TRACE[0]!.type).toBe("CONNECT");
    expect(STREAM_TRACE.at(-1)!.type).toBe("DISCONNECT");
    expect(counts["SEND"]! / STREAM_TRACE.length).toBeGreaterThan(0.5);
    expect(counts["ERROR"]).toBeGreaterThan(0);
    expect(counts["RETRY"]).toBeGreaterThan(0);
  });
});
