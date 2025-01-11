# Events

Events represent the things that affect the [state of the machine](./state.md) as it runs.

## Events are finite

Just like states, we know all the events when the machine is defined.

```mermaid
stateDiagram
    direction LR
    [*] --> disconnected
    disconnected --> connecting: CONNECT
    connecting --> connected: CONNECTED
    connecting --> connectionError: ERROR
    connected --> disconnected: DISCONNECTED
```

In this "connection" state-machine, the events are `CONNECT`, `CONNECTED`, `DISCONNECTED` and `ERROR`.

Finite means the machine will only respond to these events; the machine would ignore any other events.

## The Event type

**yay-machine** events follow the standard shape, with a `type: string` and optional "payload" (ie, any other properties you need).

```typescript
type ConnectionEvent = ConnectEvent | ConnectedEvent | ErrorEvent | DisconnectedEvent;

interface ConnectEvent {
  readonly type: 'CONNECT';
  readonly url: string;
}

interface ConnectedEvent {
  readonly type: 'CONNECTED';
}

interface DisconnectedEvent {
  readonly type: 'DISCONNECTED';
}

interface ErrorEvent {
  readonly type: 'ERROR';
  readonly error: Error;
}
```

## Sending an event to a machine

To send an event to a machine, you'll need a running instance, then simply call it's `send()` method:

```typescript
const connectionMachine = defineMachine<ConnectionState, ConnectionEvent>({ /* ... */});

const connection = connectionMachine.newInstance().start();
connection.send({ type: 'CONNECT', url: 'ws://localhost:9999/api' });
```

Of course the machine is type-safe, so you'll get an error trying to send anything else

```typescript
// ❌ ts(2322): Type '"HELLO"' is not assignable to type '"CONNECT" | "CONNECTED"' | "DISCONNECTED"' | "ERROR"'. 
connection.send({ type: 'HELLO' }); 
```

## Use event payload to manage state data

When your events have a payload (any other properties apart from `type`), you can use these to generate state data for the next state [in a transition](./transitions.md).

```typescript
type ConnectionState = 
  | { readonly name: 'disconnected' }
  | { readonly name: 'connecting' | 'connected'; readonly url: string } 
  | { readonly name: 'connectionError'; readonly errorMessage: string; 
}

const connectionMachine = defineMachine<ConnectionState, ConnectionEvent>({
  initialState: { name: "disconnected", url: '<none>' },
  states: {
    disconnected: {
      on: {
        CONNECT: { to: "connecting", data: ({ url }) => ({ url }) },
      },
    },
    connecting: {
      on: {
        ERROR: {
          to: "connectionError",
          data: ({ event }) => ({ errorMessage: String(event.error) }),
        },
      },
    },
    // ...
  },
});

const connection = connectionMachine.newInstance().start();

connection.subscribe(({ state }) => {
  if (state.name === 'connecting') {
    console.log('connecting to', state.url);
  }
  if (state.name === 'connectionError') {
    console.log('connectionFailed: %s', state.errorMessage);
  }
})

connection.send({ type: 'CONNECT', url: 'ws://localhost:9999/api' });
```

## Subscribers receive last event, if any

When you subscribe for state changes, you *might also* get the event which triggered the state change.

```typescript
const connection = connectionMachine.newInstance().start();
connection.subscribe(({ state, event }) => {
  // event: ConnectionEvent | undefined
  console.log('now in state %s, due to event', state.name, event);
})
```

When an event triggers a state-transition, `event` will be that event.

In these other cases `event` will be `undefined`:

* the first time the subscriber callback is called: it only receives the machine's current state
* when the machine transitions to a new state due to an immediate (always) transition

---

* [⬅️ Previous: **States**](./state.md)
* [Next: **Transitions** ➡️](./transitions.md)
