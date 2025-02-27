import assert from "assert";
import { loginMachine } from "./loginMachine";

const login = loginMachine.newInstance().start();
login.send({ type: "LOGIN", username: "foo", password: "bar" });
assert.deepStrictEqual(login.state, {
  name: "invalidCredentials",
  errorMessage: 'Unknown username "foo" or incorrect password',
});
