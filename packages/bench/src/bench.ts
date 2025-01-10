import benny from "benny";
import { xstateToggle } from "./xstateToggle";
import { yayToggle } from "./yayToggle";

benny.suite(
  "toggle",

  benny.add("xstateToggle.send({ type: 'toggle' })", () => {
    xstateToggle.send({ type: "toggle" });
  }),

  benny.add("yayToggle.send({ type: 'TOGGLE' })", () => {
    yayToggle.send({ type: "TOGGLE" });
  }),

  benny.cycle(),
  benny.complete(),
  benny.save({ file: "toggle", version: "1.0.0" }),
  benny.save({ file: "toggle", format: "chart.html" }),
);
