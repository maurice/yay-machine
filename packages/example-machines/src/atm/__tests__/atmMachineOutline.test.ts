import { expect, mock, test } from "bun:test";
import { atmMachine } from "../atmMachineOutline";

test("happy path, all the way through", () => {
  const atm = atmMachine.newInstance().start();
  expect(atm.state.name).toBe("waitingForCard");
  const subscriber = mock();
  atm.subscribe(subscriber);

  atm.send({ type: "CARD_INSERTED" });
  expect(atm.state.name).toBe("readingCard");

  atm.send({ type: "CARD_READ" });
  expect(atm.state.name).toBe("serviceMenu");

  atm.send({ type: "WITHDRAWAL_SELECTED" });
  expect(atm.state.name).toBe("enterPin");

  atm.send({ type: "PIN_ENTERED" });
  expect(atm.state.name).toBe("enterAmount");

  atm.send({ type: "AMOUNT_ENTERED" });
  expect(atm.state.name).toBe("validateWithdrawal");

  atm.send({ type: "WITHDRAWAL_APPROVED" });
  expect(atm.state.name).toBe("ejectCard");

  atm.send({ type: "CARD_EJECTED" });
  expect(atm.state.name).toBe("waitingForCard");

  // blink and you miss it!
  expect(
    subscriber.mock.calls.slice(-3).map(([{ state }]) => state.name),
  ).toEqual(["dispenseCash", "ejectCard", "waitingForCard"]);
});

test("invalid card", () => {
  const atm = atmMachine.newInstance().start();
  expect(atm.state.name).toBe("waitingForCard");
  const subscriber = mock();
  atm.subscribe(subscriber);

  atm.send({ type: "CARD_INSERTED" });
  expect(atm.state.name).toBe("readingCard");

  atm.send({ type: "CARD_INVALID" });
  expect(atm.state.name).toBe("ejectCard");

  atm.send({ type: "CARD_EJECTED" });
  expect(atm.state.name).toBe("waitingForCard");
});

test("user cancels at service menu", () => {
  const atm = atmMachine.newInstance().start();
  expect(atm.state.name).toBe("waitingForCard");
  const subscriber = mock();
  atm.subscribe(subscriber);

  atm.send({ type: "CARD_INSERTED" });
  expect(atm.state.name).toBe("readingCard");

  atm.send({ type: "CARD_READ" });
  expect(atm.state.name).toBe("serviceMenu");

  atm.send({ type: "USER_CANCELLED" });
  expect(atm.state.name).toBe("ejectCard");

  atm.send({ type: "CARD_EJECTED" });
  expect(atm.state.name).toBe("waitingForCard");
});

test("user cancels at enter pin", () => {
  const atm = atmMachine.newInstance().start();
  expect(atm.state.name).toBe("waitingForCard");
  const subscriber = mock();
  atm.subscribe(subscriber);

  atm.send({ type: "CARD_INSERTED" });
  expect(atm.state.name).toBe("readingCard");

  atm.send({ type: "CARD_READ" });
  expect(atm.state.name).toBe("serviceMenu");

  atm.send({ type: "WITHDRAWAL_SELECTED" });
  expect(atm.state.name).toBe("enterPin");

  atm.send({ type: "USER_CANCELLED" });
  expect(atm.state.name).toBe("ejectCard");

  atm.send({ type: "CARD_EJECTED" });
  expect(atm.state.name).toBe("waitingForCard");
});

test("user cancels at enter amount", () => {
  const atm = atmMachine.newInstance().start();
  expect(atm.state.name).toBe("waitingForCard");
  const subscriber = mock();
  atm.subscribe(subscriber);

  atm.send({ type: "CARD_INSERTED" });
  expect(atm.state.name).toBe("readingCard");

  atm.send({ type: "CARD_READ" });
  expect(atm.state.name).toBe("serviceMenu");

  atm.send({ type: "WITHDRAWAL_SELECTED" });
  expect(atm.state.name).toBe("enterPin");

  atm.send({ type: "PIN_ENTERED" });
  expect(atm.state.name).toBe("enterAmount");

  atm.send({ type: "USER_CANCELLED" });
  expect(atm.state.name).toBe("ejectCard");

  atm.send({ type: "CARD_EJECTED" });
  expect(atm.state.name).toBe("waitingForCard");
});

test("insufficient funds", () => {
  const atm = atmMachine.newInstance().start();
  expect(atm.state.name).toBe("waitingForCard");
  const subscriber = mock();
  atm.subscribe(subscriber);

  atm.send({ type: "CARD_INSERTED" });
  atm.send({ type: "CARD_READ" });
  atm.send({ type: "WITHDRAWAL_SELECTED" });
  atm.send({ type: "PIN_ENTERED" });
  atm.send({ type: "AMOUNT_ENTERED" });
  expect(atm.state.name).toBe("validateWithdrawal");

  atm.send({ type: "INSUFFICIENT_FUNDS" });
  expect(atm.state.name).toBe("ejectCard");

  atm.send({ type: "CARD_EJECTED" });
  expect(atm.state.name).toBe("waitingForCard");
});

test("incorrect pin, then correct", () => {
  const atm = atmMachine.newInstance().start();
  expect(atm.state.name).toBe("waitingForCard");
  const subscriber = mock();
  atm.subscribe(subscriber);

  atm.send({ type: "CARD_INSERTED" });
  atm.send({ type: "CARD_READ" });
  atm.send({ type: "WITHDRAWAL_SELECTED" });
  atm.send({ type: "PIN_ENTERED" });
  atm.send({ type: "AMOUNT_ENTERED" });
  expect(atm.state.name).toBe("validateWithdrawal");

  atm.send({ type: "INCORRECT_PIN" });
  expect(atm.state.name).toBe("enterPin");

  atm.send({ type: "PIN_ENTERED" });
  atm.send({ type: "AMOUNT_ENTERED" });
  expect(atm.state.name).toBe("validateWithdrawal");

  atm.send({ type: "WITHDRAWAL_APPROVED" });
  expect(atm.state.name).toBe("ejectCard");

  atm.send({ type: "CARD_EJECTED" });
  expect(atm.state.name).toBe("waitingForCard");
});
