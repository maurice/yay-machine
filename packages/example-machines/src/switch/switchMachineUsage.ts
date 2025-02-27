import assert from "assert";
import { switchMachine } from "./switchMachine";

const switchy = switchMachine.newInstance().start();
assert.deepStrictEqual(switchy.state, { name: "off" });

switchy.send({ type: "ON" });
assert.deepStrictEqual(switchy.state, { name: "on" });

switchy.send({ type: "ON" });
assert.deepStrictEqual(switchy.state, { name: "on" }); // still

switchy.send({ type: "OFF" });
assert.deepStrictEqual(switchy.state, { name: "off" });
