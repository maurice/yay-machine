# **yay-machine** vs **XState**

How does **yay-machine** stack-up against [**XState**](https://xstate.js.org/)?

## First of all

Let's be clear **XState** is amazing is so many ways.

- it's a feature-rich state-machine and state-chart library with nearly 1 million weekly downloads [from npmjs.com](https://www.npmjs.com/package/xstate)
- it is well documented and supported by an active team of core and community contributors
- it has an online editor and visualizer
- it has IDE extensions

**XState** and it's creator [David Khourshid](https://github.com/davidkpiano) have a revitalized these decades-old computer-science ideas and created modern, accessible libraries and tools for the masses.

**XState** made us realize the power and potential of state-machines and we've successfully used it for our own production projects.

**yay-machine** borrows a lot of ideas directly from **XState**, so it's fair to say that without **XState**, **yay-machine** would not exist.

Also we are not **XState** experts, and we are (just a little) biased, so while we try to be objective below, please reach out if you can suggest ways to improve this article.

## Kitchen-sink vs Lean-and-mean

One important difference is that **yay-machine** is intentionally simple. We believe you can do a lot given the ability to combine a few powerful primitive features.

In a nutshell, we want **yay-machine** to be simple to learn, quick to get running, and have a low ongoing cost-of-ownership.

We feel that size of the **XState** ecosystem, feature-set, documentation, etc, is actually a barrier to entry, and the more advanced features you adopt, the higher the ongoing cost-of-ownership. **XState** has  introduced some major (sometimes breaking) changes over the last few years, it can be hard to stay up-to-date.

Additionally we value library size and performance, and keeping things small and simple means **yay-machine** outperforms **XState** here \*\*CITATIONS NEEDED!\*\*.

Read more about [our philosophy here](./why-yay-machine.md#philosophy).

## Homogenous vs Heterogenous context/state-data

The current state of an **XState** machine is a combination of a state name (like `'playing'`) or nested object (like `{ paused: 'buffering' }`) PLUS a **context** object (aka extended state). (There is also a `meta` property which we ignore for now). Here's an example [from their docs](https://stately.ai/docs/states#state-object)

```typescript
const feedbackMachine = createMachine({
  id: 'feedback',
  initial: 'question',
  context: {
    feedback: '',
  },
  states: {
    question: {
      meta: {
        question: 'How was your experience?',
      },
    },
  },
});

const actor = createActor(feedbackMachine);
actor.start();

console.log(actor.getSnapshot());
// Logs an object containing:
// {
//   value: 'question',
//   context: {
//     feedback: ''
//   },
//   meta: {
//     'feedback.question': {
//       question: 'How was your experience?'
//     }
//   }
// }
```

However the **context** object must have the same TypeScript type in every named state.

This works well for some domains, but in others you might want to have different "context" per logical state.

So even though the machine is in the `'question'` state - presumably prompting the user to enter feedback - the `context` is `{ feedback: '' }` as if the user's feedback is an empty string 🤷?

Another example might be that your machine has a final `'fatalError'` state which adds an `errorMessage` to the context (eg, from an event). But because the error is only relevant to one state, the context type's `errorMessage` property must be optional, even if **we know** it should exist in a specific state. In this case we need to use the TypeScript non-null assertion operator and incur the rath of linters. This type-ambiguity and subversion of the type-system bothers us.

In **yay-machine** we use the term "state data" and our states are free to have **homogenous state-data** (all states share the same state-data type) or **heterogenous state-data** (some or all states have different state-data types).

In **yay-machine** we could expand the above like this

```typescript
interface QuestionState {
  readonly name: 'question';
}

interface FeedbackProvidedState {
  readonly name: 'feedbackProvided';
  readonly feedback: string;
}

interface FeedbackEvent {
  readonly type: 'FEEDBACK';
  readonly feedback: string;
}

const feedbackMachine = defineMachine<QuestionState | FeedbackProvidedState, FeedbackEvent>({
  initialState: { name: 'question' },
  states: {
    question: {
      on: {
        FEEDBACK: {
          to: 'feedbackProvided',
          data: ({ event: { feedback }}) => ({ feedback }),
        }
      }
    }
  }
})
const feedback = feedbackMachine.newInstance();
feedback.start();

console.log(feedback.state);
// { name: 'question' }

feedback.send({ type: 'FEEDBACK', feedback: 'Keep up the good work!' });

console.log(feedback.state);
// { name: 'feedbackProvided', feedback: 'Keep up the good work!' }
```

In this machine the `feedback` state-data property is ONLY present in the `'feedbackProvided'` state.

Of course this is enforced in all the types, so you can be sure that you'll never see a `feedback` state-data value when you're not expecting it.

And you are still free to model your state-data with optional fields or empty strings if you prefer.

## Ecosystem at a glance

|          | **XState** | **yay-machine** |
| -------- | -------- | ------- |
| Discord | ✅ | ❌    |
| Visualizer | ✅ | ❌    |
| Online editor | ✅ | ❌    |
| View library bindings (React, Vue, Svelte) | ✅ | ❌ (planned) |
| Docs | ✅ | 🚧 (in progress) |

## State-machine and state-chart features at a glance

|          | **XState** | **yay-machine** |
| -------- | -------- | ------- |
| Flat state-machines | ✅ | ✅    |
| Declarative JSON configuration | ✅ | ✅    |
| Create independent machine instances | ✅ | ✅    |
| Initial state (and context/state-data) overridable per machine-instance | ✅ | ✅ |
| Machine instance lifecycle: subscribe-to, start, send events, and stop | ✅ | ✅    |
| Invoke/spawn Actors within machine | ✅ | ✅ (covered by our "side-effects") |
| Actions | ✅ | ✅ (yes, our `data()` callback and/or "side-effects") |
| Native `Promise`, `Observable`, `EventObservable` Actors | ✅ | ❌ (not native, but easily done) |
| Eventless (always) transitions | ✅ | ✅ (we say "immediate") |
| Delayed (after) transitions | ✅ | ❌ (easy via side-effect + `setTimeout()`) |
| Guards (conditional transitions) | ✅ | ✅ |
| Parent/child states | ✅ | ❌ (not yet, for now just flatten them) |
| Parallel states | ✅ | ❌ (not yet, for now compose child machines) |
| Final states | ✅ | ❌ (nothing formal) |
| History states | ✅ | ❌ (user-land concern) |
| Persistence (serialization/deserialization)| ✅ | ❌ (not a goal) |

We're working on adding documentation. We aim to provide examples of the above existing features and suggest ways to deal with some of the features that **XState** has and **yay-machine** doesn't have.
