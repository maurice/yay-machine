import { defineMachine } from "yay-machine";

/**
 * This file contains examples of "heterogenous state" machines,
 * but mainly to test the library's types are working as expected
 * with respect to the `enableCopyDataOnTransition` vs `data()` callback being defined
 */

type HeterogenousState =
  | { readonly name: "a"; readonly aData: string }
  | { readonly name: "b"; readonly bData: boolean };

type HeterogenousEvent =
  | {
      readonly type: "NEXT";
    }
  | { readonly type: "PREV"; readonly name: string };

export const heterogenousMachineOK = defineMachine<
  HeterogenousState,
  HeterogenousEvent
>({
  initialState: { name: "a", aData: "" },
  states: {
    a: {
      on: {
        NEXT: { to: "b", data: () => ({ bData: true }) },
      },
    },
    b: {
      on: {
        NEXT: { to: "a", data: () => ({ aData: "yes" }) },
      },
    },
  },
});

export const heterogenousMachineHandleEventInAnyStateWithReenterTransitionEffectOK =
  defineMachine<HeterogenousState, HeterogenousEvent>({
    initialState: { name: "a", aData: "" },
    states: {},
    on: {
      NEXT: {
        when: ({ state }) => state.name === "a",
        // oops this should be a type error since we are in any state
        data: () => ({ bData: true }),
        onTransition: ({ state, event, send }) => {
          console.log("returning to state", state, "via event", event, send);
        },
      },
    },
  });

/**
 * `enableCopyDataOnTransition` is not allowed when the state-data is heterogenous
 */
export const heterogenousMachineCopyDataOnTransitionError = defineMachine<
  HeterogenousState,
  HeterogenousEvent
>({
  // @ts-expect-error: `enableCopyDataOnTransition` not allowed for heterogenous state
  enableCopyDataOnTransition: true,
  initialState: { name: "a", aData: "" },
  states: {
    a: {
      on: {
        NEXT: { to: "b", data: () => ({ bData: true }) },
      },
    },
    b: {
      on: {
        NEXT: { to: "a", data: () => ({ aData: "yes" }) },
      },
    },
  },
});

/**
 * `enableCopyDataOnTransition` is not allowed when the state-data is heterogenous
 */
export const heterogenousMachineCopyDataOnTransitionError2 = defineMachine<
  HeterogenousState,
  HeterogenousEvent
>({
  // @ts-expect-error: `enableCopyDataOnTransition` not allowed for heterogenous state
  enableCopyDataOnTransition: false,
  initialState: { name: "a", aData: "" },
  states: {
    a: {
      on: {
        NEXT: { to: "b", data: () => ({ bData: true }) },
      },
    },
    b: {
      on: {
        NEXT: { to: "a", data: () => ({ aData: "yes" }) },
      },
    },
  },
});

/**
 * `data()` callback missing for some transition
 */
export const heterogenousMachineMissingDataError = defineMachine<
  HeterogenousState,
  HeterogenousEvent
>({
  initialState: { name: "a", aData: "blah" },
  states: {
    a: {
      on: {
        NEXT: { to: "b", data: () => ({ bData: true }) },
      },
    },
    b: {
      on: {
        // @ts-expect-error: missing `data()` callback
        NEXT: { to: "a" },
      },
    },
  },
});
