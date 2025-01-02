import { expect, mock, test } from "bun:test";
import { defineMachine } from "../defineMachine";

interface ProcessingState {
  readonly name: "processing";
}

interface OutForDeliveryState {
  readonly name: "outForDelivery";
}

interface DeliveredState {
  readonly name: "delivered";
  readonly customerCollected?: boolean;
}

interface CancelledState {
  readonly name: "cancelled";
  readonly onCancelled: () => void;
}

type OrderState = ProcessingState | OutForDeliveryState | DeliveredState | CancelledState;

interface SubmitEvent {
  readonly type: "SUBMIT";
}

interface OutForDeliveryEvent {
  readonly type: "OUT_FOR_DELIVERY";
}

interface DeliverEvent {
  readonly type: "DELIVER";
}

interface CancelEvent {
  readonly type: "CANCEL";
  readonly onCancelled: () => void;
}

type OrderEvent = SubmitEvent | OutForDeliveryEvent | DeliverEvent | CancelEvent;

const orderMachine = defineMachine<OrderState, OrderEvent>({
  initialState: { name: "processing" },
  states: {
    processing: {
      on: {
        OUT_FOR_DELIVERY: { to: "outForDelivery" },
      },
    },
    outForDelivery: {
      on: {
        DELIVER: { to: "delivered", data: () => ({ customerCollected: false }) },
      },
    },
  },
  on: {
    CANCEL: {
      to: "cancelled",
      data: (_, { onCancelled }) => ({ onCancelled }),
      onTransition: ({ next: { onCancelled } }) => onCancelled(),
    },
    DELIVER: { to: "delivered", data: () => ({ customerCollected: true }) },
  },
});

const newMachine = () => {
  const machine = orderMachine.newInstance();
  machine.start();
  return machine;
};

test("CANCEL event is handled in any non-cancelled state", () => {
  let machine = newMachine();
  const onCancelled = mock();

  // processing -> cancelled
  expect(machine.state).toEqual({ name: "processing" });
  expect(onCancelled).not.toHaveBeenCalled();
  machine.send({ type: "CANCEL", onCancelled });
  expect(machine.state).toEqual({ name: "cancelled", onCancelled });
  expect(onCancelled).toHaveBeenCalledTimes(1);

  // outForDelivery -> cancelled
  machine = newMachine();
  machine.send({ type: "OUT_FOR_DELIVERY" });
  expect(machine.state).toEqual({ name: "outForDelivery" });
  machine.send({ type: "CANCEL", onCancelled });
  expect(machine.state).toEqual({ name: "cancelled", onCancelled });
  expect(onCancelled).toHaveBeenCalledTimes(2);

  // cancelled -> X
  machine = newMachine();
  machine.send({ type: "CANCEL", onCancelled });
  expect(machine.state).toEqual({ name: "cancelled", onCancelled });
  expect(onCancelled).toHaveBeenCalledTimes(3);
  machine.send({ type: "CANCEL", onCancelled });
  expect(machine.state).toEqual({ name: "cancelled", onCancelled });
  expect(onCancelled).toHaveBeenCalledTimes(3); // still
});

test("DELIVER event is handled in specific or any state", () => {
  let machine = newMachine();

  // processing -> delivered
  expect(machine.state).toEqual({ name: "processing" });
  machine.send({ type: "DELIVER" });
  expect(machine.state).toEqual({ name: "delivered", customerCollected: true });

  // outForDelivery -> delivered
  machine = newMachine();
  machine.send({ type: "OUT_FOR_DELIVERY" });
  expect(machine.state).toEqual({ name: "outForDelivery" });
  machine.send({ type: "DELIVER" });
  expect(machine.state).toEqual({ name: "delivered", customerCollected: false });
});
