# Side-effects

Side-effects allow your state-machines to interact with the outside world.

In **yay-machine** you can optionally perform side-effects 

* when the machine is started or stopped
* when a state is entered or exited
* during a transition

## Side-effects are just functions

In **yay-machine** side-effects are just functions.

The side-effect function MAY return a cleanup function, which you can use to free resources (eg, clear timers, release connections, etc).

```typescript
type Cleanup = () => void;

type SideEffect = (param: { /* ... */}) => Cleanup | null | undefined | void;
```

## Side-effect lifetime

The lifetime of a side-effect matches the lifetime of where it is defined.

More concretely

* a **machine `onStart()` side-effect** may run as long as the machine is running (not stopped). When the machine is stopped, the machine-start side-effect is cleaned-up
* a **state `onEnter()` side-effect** may run as long as the machine remains in that state. When the machine exits that state (or stopped), the state-enter side-effect is cleaned-up
* a **transition `onTransition()` side-effect** is transient, since it only exists for the transition, so it is cleaned-up immediately
* a **state `onExit()` side-effect**  is transient, since it only exists while exiting the state, so it is cleaned-up immediately
* a **machine `onStop()` side-effect**  is transient, since it only exists while stopping the machine, so it is cleaned-up immediately

## Machine lifecycle side-effects: `onStart()`, `onStop()`

These two optional side-effects are performed when the machine is started/stopped

```typescript
const machine = defineMachine<State, Event>({
  onStart: ({ state, send }) => { /* ... */ },
  onStop: ({ state }) => { /* ... */ },
  // ...
});
```

They receive a single parameter containing the machine's current `state` and a `send()` function, which can be used to send events to the machine instance.

> 💡 **Tip** 
>
> Return a cleanup function to free resources (clear timers, disconnect subscriptions, ....)

## State lifecycle side-effects: `onEnter()`, `onExit()`

These two optional side-effects are performed when a specific state is entered or exited

```typescript
const machine = defineMachine<State, Event>({
  states: {
    [stateName]: {
      onEnter: ({ state, send }) =>{ /* ... */ },
      onExit: ({ state, send }) =>{ /* ... */ },
    },
  },
  // ...
});
```

Like machine-lifecycle side-effects, they receive a single parameter containing the machine's current `state` and a `send()` function, which can be used to send events to the machine instance.

> 💡 **Tip** 
>
> Return a cleanup function to free resources (clear timers, disconnect subscriptions, ....)

> 💡 **Tip** 
>
> See the section on [`reenter: false` in the states documentation](./state.md) if you need to keep `onEnter()` side-effects alive while transitioning from a state back to the same state.

## Transition side-effect: `onTransition()`

This optional side-effect is performed during a transition from a specific state or *any state*

```typescript
const machine = defineMachine<State, Event>({
  states: {
    [stateName]: {
      on: {
        [EVENT_TYPE]: {
          to: 'nextStateName',
          onTransition: ({ state, event, next, send }) => { /* ... */ },
        },
      },
    },
  },
  // ...
});
```

And/or

```typescript
const machine = defineMachine<State, Event>({
  on: {
    [EVENT_TYPE]: {
      to: 'nextStateName',
      onTransition: ({ state, event, next, send }) => { /* ... */ },
    },
  }
  // ...
});
```

Transition side-effects receive a single parameter containing the machine's current `state`, the current `event`, the `next` state, and a `send()` function, which can be used to send events to the machine instance.

---

<!-- GUIDED PATH NAVIGATION -->

* [Previous page: **Transitions**](./transitions.md)
* [Next page: **Machines**](./machines.md)
