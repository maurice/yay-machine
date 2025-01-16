import { defineMachine } from "yay-machine";

/**
 * This file contains examples of "homogenous state" machines,
 * but mainly to test the library's types are working as expected
 * with respect to the `enableCopyDataOnTransition` vs `data()` callback being defined
 */

interface HomogenousState {
  readonly name: "a" | "b";
  readonly data: string;
}

interface HomogenousEvent {
  readonly type: "NEXT";
}

/**
 * `enableCopyDataOnTransition: true` means transitions don't need to provide `data()` - it will be copied by default
 */
export const homogenousMachineCopyDataOnTransitionOK = defineMachine<
  HomogenousState,
  HomogenousEvent
>({
  enableCopyDataOnTransition: true,
  initialState: { name: "a", data: "" },
  states: {
    a: {
      on: {
        NEXT: { to: "b", data: ({ state }) => state },
      },
    },
    b: {
      on: {
        NEXT: { to: "a" },
      },
    },
  },
});

/**
 * `enableCopyDataOnTransition` is not defined but transitions don't have `data()` callbacks either
 */
export const homogenousMachineCopyDataOnTransitionError = defineMachine<
  HomogenousState,
  HomogenousEvent
  // @ts-expect-error: either set `enableCopyDataOnTransition: true` or provide `data()` callbacks
>({
  initialState: { name: "a", data: "" },
  states: {
    a: {
      on: {
        NEXT: { to: "b" },
      },
    },
    b: {
      on: {
        NEXT: { to: "a" },
      },
    },
  },
});

/**
 * `enableCopyDataOnTransition` is not defined and all transitions have `data()` callbacks
 */
export const homogenousMachineNoCopyDataOnTransitionOK = defineMachine<
  HomogenousState,
  HomogenousEvent
>({
  initialState: { name: "a", data: "" },
  states: {
    a: {
      on: {
        NEXT: { to: "b", data: ({ state }) => state },
      },
    },
    b: {
      on: {
        NEXT: { to: "a", data: ({ state }) => state },
      },
    },
  },
});

/**
 * `enableCopyDataOnTransition` is `false` and all transitions have `data()` callbacks
 */
export const homogenousMachineNoCopyDataOnTransitionOK2 = defineMachine<
  HomogenousState,
  HomogenousEvent
>({
  enableCopyDataOnTransition: false,
  initialState: { name: "a", data: "" },
  states: {
    a: {
      on: {
        NEXT: { to: "b", data: ({ state }) => state },
      },
    },
    b: {
      on: {
        NEXT: { to: "a", data: ({ state }) => state },
      },
    },
  },
});

/**
 * `enableCopyDataOnTransition` is not defined but one transitions doesn't have `data()` callback
 */
export const homogenousMachineNoCopyDataOnTransitionError = defineMachine<
  HomogenousState,
  HomogenousEvent
  // @ts-expect-error: `enableCopyDataOnTransition` is not `true` but one of the transitions is missing `data()` callback
>({
  initialState: { name: "a", data: "" },
  states: {
    a: {
      on: {
        NEXT: { to: "b" },
      },
    },
    b: {
      on: {
        NEXT: { to: "a", data: ({ state }) => state },
      },
    },
  },
});
