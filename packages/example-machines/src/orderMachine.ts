import { defineMachine } from "yay-machine";

interface PlacedState {
  readonly name: "placed";
  readonly orderId: string;
  readonly placedTime: number;
  readonly items: readonly string[]; // eg item IDs
}

interface CancelledState extends Omit<PlacedState, "name"> {
  readonly name: "cancelled";
  readonly cancelledTime: number;
}

interface ProcessingState extends Omit<PlacedState, "name"> {
  readonly name: "processing";
  readonly processingTime: number;
}

interface DispatchedState extends Omit<ProcessingState, "name"> {
  readonly name: "dispatched";
  readonly dispatchTime: number;
}

interface DeliveredState extends Omit<DispatchedState, "name"> {
  readonly name: "delivered";
  readonly deliveredTime: number;
}

interface FinalState extends Omit<DeliveredState, "name"> {
  readonly name: "final";
}

interface PendingReturnState extends Omit<DeliveredState, "name"> {
  readonly name: "pendingReturn";
  readonly pendingReturnTime: number;
}

interface ReturnReceivedState extends Omit<DeliveredState, "name"> {
  readonly name: "returnReceived";
  readonly receivedTime: number;
}

type OrderState =
  | PlacedState
  | CancelledState
  | ProcessingState
  | DispatchedState
  | DeliveredState
  | FinalState
  | PendingReturnState
  | ReturnReceivedState;

interface OrderEvent {
  readonly type:
    | "CANCEL"
    | "PROCESSING"
    | "DISPATCHED"
    | "DELIVERED"
    | "PENDING_RETURN"
    | "RETURN_RECEIVED"
    | "FINAL";
  readonly time: number;
}

/**
 * A simplified e-commerce order state-machine
 */
export const orderMachine = defineMachine<OrderState, OrderEvent>({
  initialState: {
    name: "placed",
    orderId: undefined!,
    placedTime: -1,
    items: [],
  },
  states: {
    placed: {
      on: {
        PROCESSING: {
          to: "processing",
          data: ({ state, event }) => ({
            ...state,
            processingTime: event.time,
          }),
        },
        CANCEL: {
          to: "cancelled",
          data: ({ state, event }) => ({ ...state, cancelledTime: event.time }),
        },
      },
    },
    processing: {
      on: {
        DISPATCHED: {
          to: "dispatched",
          data: ({ state, event }) => ({ ...state, dispatchTime: event.time }),
        },
      },
    },
    dispatched: {
      on: {
        DELIVERED: {
          to: "delivered",
          data: ({ state, event }) => ({ ...state, deliveredTime: event.time }),
        },
      },
    },
    delivered: {
      onEnter: ({ send }) => {
        const timer = setTimeout(() =>
          send({ type: "FINAL", time: Date.now() }),
        );
        return () => clearTimeout(timer);
      },
      on: {
        PENDING_RETURN: {
          to: "pendingReturn",
          data: ({ state, event }) => ({
            ...state,
            pendingReturnTime: event.time,
          }),
        },
        FINAL: {
          to: "final",
          data: ({ state }) => state,
        },
      },
    },
    pendingReturn: {
      on: {
        RETURN_RECEIVED: {
          to: "returnReceived",
          data: ({ state, event }) => ({ ...state, receivedTime: event.time }),
        },
      },
    },
  },
});
