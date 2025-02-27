import assert from "assert";
import { counterMachine } from "./counterMachine";

// standard
const counter = counterMachine.newInstance().start();
assert.equal(counter.state.count, 0);

counter.send({ type: "INC" });
counter.send({ type: "INC" });
counter.send({ type: "INC" });
assert.equal(counter.state.count, 3);

counter.send({ type: "DEC" });
assert.equal(counter.state.count, 2);

// custom range
const range = counterMachine
  .newInstance({
    initialState: { name: "counting", count: 43, min: 0, max: 100 },
  })
  .start();
assert.equal(range.state.count, 43);
