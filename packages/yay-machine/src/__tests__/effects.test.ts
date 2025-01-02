import { expect, mock, test } from "bun:test";
import { type EffectParams, defineMachine } from "../defineMachine";

interface EffectsStateData {
  readonly onStart: (params: EffectParams<EffectsState, EffectsEvent, EffectsState, EffectsState>) => void;
  readonly onStop: (params: EffectParams<EffectsState, EffectsEvent, EffectsState, EffectsState>) => void;
  readonly onEnterA: (params: EffectParams<EffectsState, EffectsEvent, EffectsState, EffectsState>) => void;
  readonly onExitA: (params: EffectParams<EffectsState, EffectsEvent, EffectsState, EffectsState>) => void;
  readonly onEnterB: (params: EffectParams<EffectsState, EffectsEvent, EffectsState, EffectsState>) => void;
  readonly onExitB: (params: EffectParams<EffectsState, EffectsEvent, EffectsState, EffectsState>) => void;
  readonly onTransitionAToB: (params: EffectParams<EffectsState, EffectsEvent, EffectsState, EffectsState>) => void;
}

type EffectsState = AState | BState;

interface AState extends EffectsStateData {
  readonly name: "a";
  readonly onlyExistsInA: true;
}

interface BState extends EffectsStateData {
  readonly name: "b";
  readonly onlyExistsInB: true;
}

interface EffectsEvent {
  readonly type: "TO_A" | "TO_B";
}

const effectMachine = defineMachine<AState | BState, EffectsEvent>({
  initialState: {
    name: "a",
    onlyExistsInA: true,
    onStart: () => {},
    onStop: () => {},
    onEnterA: () => {},
    onExitA: () => {},
    onEnterB: () => {},
    onExitB: () => {},
    onTransitionAToB: () => {},
  },
  onStart: (params) => params.state.onStart(params),
  onStop: (params) => params.state.onStop(params),
  states: {
    a: {
      onEnter: (params) => params.state.onEnterA(params),
      onExit: (params) => params.state.onExitA(params),
      on: {
        TO_B: {
          to: "b",
          with: ({ name, ...effects }) => ({ ...effects, onlyExistsInB: true }),
          onTransition: (params) => params.state.onTransitionAToB(params),
        },
      },
    },
    b: {
      onEnter: (params) => params.state.onEnterB(params),
      onExit: (params) => params.state.onExitB(params),
      on: {
        TO_A: { to: "a", with: ({ name, ...effects }) => ({ ...effects, onlyExistsInA: true }) },
      },
    },
  },
});

const createInitialState = () => {
  const calls: string[] = [];
  const effectMock = (name: string) => {
    return mock(() => {
      calls.push(name);
      return mock();
    });
  };
  return {
    calls,
    initialState: {
      name: "a",
      onlyExistsInA: true,
      onStart: effectMock("onStart"),
      onStop: effectMock("onStop"),
      onEnterA: effectMock("onEnterA"),
      onExitA: effectMock("onExitA"),
      onEnterB: effectMock("onEnterB"),
      onExitB: effectMock("onExitB"),
      onTransitionAToB: effectMock("onTransitionAToB"),
    },
  } as const;
};

test("machine onStart called when machine starts", () => {
  const { initialState } = createInitialState();
  const machine = effectMachine.newInstance({ initialState });
  expect(initialState.onStart).not.toHaveBeenCalled();
  expect(initialState.onStop).not.toHaveBeenCalled();
  expect(initialState.onEnterA).not.toHaveBeenCalled();
  expect(initialState.onExitA).not.toHaveBeenCalled();
  expect(initialState.onEnterB).not.toHaveBeenCalled();
  expect(initialState.onExitB).not.toHaveBeenCalled();
  expect(initialState.onTransitionAToB).not.toHaveBeenCalled();

  machine.start();
  expect(machine.state).toMatchObject({ name: "a" });
  expect(initialState.onStart).toHaveBeenCalledTimes(1);
});

test("machine onStart effect cleaned-up when machine stopped", () => {
  const { initialState } = createInitialState();
  const machine = effectMachine.newInstance({ initialState });

  machine.start();
  expect(initialState.onStart).toHaveBeenCalledTimes(1);

  expect(machine.state).toMatchObject({ name: "a" });
  machine.send({ type: "TO_B" });
  expect(machine.state).toMatchObject({ name: "b" });
  expect(initialState.onStart).toHaveBeenCalledTimes(1); // still
  expect(initialState.onStart.mock.results[0]?.value).not.toHaveBeenCalled();

  machine.stop();
  expect(initialState.onStart).toHaveBeenCalledTimes(1); // still
  expect(initialState.onStart.mock.results[0]?.value).toHaveBeenCalledTimes(1);
});

test("machine onStop effect called and cleaned-up when machine stopped", () => {
  const { initialState } = createInitialState();
  const machine = effectMachine.newInstance({ initialState });

  machine.start();
  expect(initialState.onStop).not.toHaveBeenCalled();

  expect(machine.state).toMatchObject({ name: "a" });
  machine.send({ type: "TO_B" });
  expect(machine.state).toMatchObject({ name: "b" });
  expect(initialState.onStop).not.toHaveBeenCalled(); // still

  machine.stop();
  expect(initialState.onStop).toHaveBeenCalledTimes(1);
  expect(initialState.onStop.mock.results[0]?.value).toHaveBeenCalledTimes(1);
});

test("state onEnter called for the initial state", () => {
  const { initialState } = createInitialState();
  const machine = effectMachine.newInstance({ initialState });

  machine.start();
  expect(machine.state).toMatchObject({ name: "a" });
  expect(initialState.onEnterA).toHaveBeenCalledTimes(1);
  expect(initialState.onEnterA.mock.results[0]?.value).not.toHaveBeenCalled();

  machine.stop();
  expect(initialState.onEnterA).toHaveBeenCalledTimes(1); // still
  expect(initialState.onEnterA.mock.results[0]?.value).toHaveBeenCalledTimes(1);
  expect(initialState.onExitA).toHaveBeenCalledTimes(1);
  expect(initialState.onExitA.mock.results[0]?.value).toHaveBeenCalledTimes(1);
});

test("state onEnter, onExit and onTransition effects called and cleaned-up when transitioned", () => {
  const { initialState, calls } = createInitialState();
  const machine = effectMachine.newInstance({ initialState });

  machine.start();
  expect(machine.state).toMatchObject({ name: "a" });
  expect(initialState.onEnterA).toHaveBeenCalledTimes(1);
  expect(initialState.onEnterA.mock.results[0]?.value).not.toHaveBeenCalled();
  expect(initialState.onExitA).not.toHaveBeenCalled();
  expect(initialState.onTransitionAToB).not.toHaveBeenCalled();

  machine.send({ type: "TO_B" });
  expect(machine.state).toMatchObject({ name: "b" });
  expect(initialState.onEnterA).toHaveBeenCalledTimes(1); // still
  expect(initialState.onEnterA.mock.results[0]?.value).toHaveBeenCalledTimes(1);
  expect(initialState.onExitA).toHaveBeenCalledTimes(1); // still
  expect(initialState.onExitA.mock.results[0]?.value).toHaveBeenCalledTimes(1);
  expect(initialState.onTransitionAToB).toHaveBeenCalledTimes(1);
  expect(initialState.onTransitionAToB.mock.results[0]?.value).toHaveBeenCalledTimes(1);
  expect(initialState.onEnterB).toHaveBeenCalledTimes(1); // still
  expect(initialState.onEnterB.mock.results[0]?.value).not.toHaveBeenCalled();
  expect(initialState.onExitB).not.toHaveBeenCalled();

  machine.send({ type: "TO_A" });
  expect(machine.state).toMatchObject({ name: "a" });
  expect(initialState.onEnterB).toHaveBeenCalledTimes(1); // still
  expect(initialState.onEnterB.mock.results[0]?.value).toHaveBeenCalledTimes(1);
  expect(initialState.onExitB).toHaveBeenCalledTimes(1); // still
  expect(initialState.onExitB.mock.results[0]?.value).toHaveBeenCalledTimes(1);
  expect(initialState.onTransitionAToB).toHaveBeenCalledTimes(1); // still
  expect(initialState.onTransitionAToB.mock.results[0]?.value).toHaveBeenCalledTimes(1); // still
  expect(initialState.onEnterA).toHaveBeenCalledTimes(2);
  expect(initialState.onEnterA.mock.results[1]?.value).not.toHaveBeenCalled();
  expect(initialState.onExitA).toHaveBeenCalledTimes(1); // still
  expect(initialState.onExitA.mock.results[0]?.value).toHaveBeenCalledTimes(1);

  machine.send({ type: "TO_B" });
  expect(machine.state).toMatchObject({ name: "b" });
  expect(initialState.onEnterA).toHaveBeenCalledTimes(2);
  expect(initialState.onEnterA.mock.results[1]?.value).toHaveBeenCalledTimes(1);
  expect(initialState.onExitA).toHaveBeenCalledTimes(2);
  expect(initialState.onExitA.mock.results[1]?.value).toHaveBeenCalledTimes(1);
  expect(initialState.onTransitionAToB).toHaveBeenCalledTimes(2);
  expect(initialState.onTransitionAToB.mock.results[1]?.value).toHaveBeenCalledTimes(1);
  expect(initialState.onEnterB).toHaveBeenCalledTimes(2);
  expect(initialState.onEnterB.mock.results[1]?.value).not.toHaveBeenCalled();
  expect(initialState.onExitB).toHaveBeenCalledTimes(1); // still

  machine.stop();
  expect(initialState.onEnterA).toHaveBeenCalledTimes(2);
  expect(initialState.onEnterA.mock.results[1]?.value).toHaveBeenCalledTimes(1);
  expect(initialState.onExitA).toHaveBeenCalledTimes(2);
  expect(initialState.onExitA.mock.results[1]?.value).toHaveBeenCalledTimes(1);
  expect(initialState.onEnterB).toHaveBeenCalledTimes(2);
  expect(initialState.onEnterB.mock.results[1]?.value).toHaveBeenCalledTimes(1);
  expect(initialState.onExitB).toHaveBeenCalledTimes(2);
  expect(initialState.onExitB.mock.results[1]?.value).toHaveBeenCalledTimes(1);

  expect(calls).toMatchInlineSnapshot(`
[
  "onStart",
  "onEnterA",
  "onExitA",
  "onTransitionAToB",
  "onEnterB",
  "onExitB",
  "onEnterA",
  "onExitA",
  "onTransitionAToB",
  "onEnterB",
  "onExitB",
  "onStop",
]
`);
});

test("effect functions receive current state and send function plus next state when transitioning", () => {
  const { initialState } = createInitialState();
  const machine = effectMachine.newInstance({ initialState });

  machine.start();
  expect(initialState.onStart).toHaveBeenCalledWith({
    state: expect.objectContaining({ name: "a", onlyExistsInA: true }),
    send: expect.any(Function),
  });
  expect(initialState.onEnterA).toHaveBeenCalledWith({
    state: expect.objectContaining({ name: "a", onlyExistsInA: true }),
    send: expect.any(Function),
  });

  machine.send({ type: "TO_B" });
  expect(initialState.onExitA).toHaveBeenCalledWith({
    state: expect.objectContaining({ name: "a", onlyExistsInA: true }),
    send: expect.any(Function),
  });
  expect(initialState.onTransitionAToB).toHaveBeenCalledWith({
    state: expect.objectContaining({ name: "a", onlyExistsInA: true }),
    send: expect.any(Function),
    next: expect.objectContaining({ name: "b", onlyExistsInB: true }),
  });
  expect(initialState.onEnterB).toHaveBeenCalledWith({
    state: expect.objectContaining({ name: "b", onlyExistsInB: true }),
    send: expect.any(Function),
  });

  machine.stop();
  expect(initialState.onExitB).toHaveBeenCalledWith({
    state: expect.objectContaining({ name: "b", onlyExistsInB: true }),
    send: expect.any(Function),
  });
  expect(initialState.onStop).toHaveBeenCalledWith({
    state: expect.objectContaining({ name: "b", onlyExistsInB: true }),
    send: expect.any(Function),
  });
});
