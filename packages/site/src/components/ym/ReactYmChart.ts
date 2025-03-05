import { createComponent } from "@lit/react";
import React from "react";
import { YmChart } from "./YmChart";

export const ReactYmChart = createComponent({
  tagName: "ym-chart",
  elementClass: YmChart,
  react: React,
  //   events: {
  //     onactivate: "activate",
  //     onchange: "change",
  //   },
});
