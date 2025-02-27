import assert from "assert";
import { type PriceLiveState, priceMachine } from "./priceMachine";

const price = priceMachine.newInstance().start();
price.send({ type: "TICK", price: 41, timeValid: 5_000 });
price.send({ type: "TICK", price: 42, timeValid: 5_000 });
const { priceTime: _, ...state } = price.state as PriceLiveState;
assert.deepStrictEqual(state, {
  name: "live",
  price: 42,
  change: "up",
  timeValid: 5_000,
});
