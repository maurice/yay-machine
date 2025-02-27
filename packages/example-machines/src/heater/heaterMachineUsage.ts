import assert from "assert";
import { heaterMachine } from "./heaterMachine";

// initially off
const heater = heaterMachine.newInstance().start();
assert.deepStrictEqual(heater.state, {
  name: "off",
  temperature: 21,
  integrityCheck: "2+2=4",
});

// switch on; machine enters "self-check" state
heater.send({ type: "ON" });
assert.deepStrictEqual(heater.state, {
  name: "selfCheck",
  temperature: 21,
  integrityCheck: "2+2=4",
});

// wait for async self-check to complete
await new Promise<void>((resolve) => {
  const unsubscribe = heater.subscribe(({ state }) => {
    if (state.name === "heat") {
      resolve();
      unsubscribe();
    }
  });
});

// heater is in "heat" mode
assert.deepStrictEqual(heater.state, {
  name: "heat",
  temperature: 21,
  integrityCheck: "2+2=4",
});

// make it hotter
heater.send({ type: "HOTTER" });
heater.send({ type: "HOTTER" });
heater.send({ type: "HOTTER" });
assert.deepStrictEqual(heater.state, {
  name: "heat",
  temperature: 24,
  integrityCheck: "2+2=4",
});

// switch to "cool" mode
for (let i = 0; i < 15; i++) {
  heater.send({ type: "COOLER" });
}
assert.deepStrictEqual(heater.state, {
  name: "cool",
  temperature: 9,
  integrityCheck: "2+2=4",
});
