import assert from "assert";
import { toggleMachine } from "./toggleMachine";

const toggle = toggleMachine.newInstance().start();
assert.deepStrictEqual(toggle.state, { name: "off" });

toggle.send({ type: "TOGGLE" });
assert.deepStrictEqual(toggle.state, { name: "on" });

toggle.send({ type: "TOGGLE" });
assert.deepStrictEqual(toggle.state, { name: "off" });
