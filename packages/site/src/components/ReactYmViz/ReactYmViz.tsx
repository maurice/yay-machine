import { type ReactWebComponent, createComponent } from "@lit/react";
import React, { type ComponentProps } from "react";
import type { MachineEvent, MachineState } from "yay-machine";
import { YmViz } from "../ym";

const __ReactYmViz = createComponent({
  tagName: "ym-viz",
  elementClass: YmViz,
  react: React,
  //   events: {
  //     onactivate: "activate",
  //     onchange: "change",
  //   },
});

export const ReactYmViz = <
  StateType extends MachineState,
  EventType extends MachineEvent,
>(
  // biome-ignore lint/complexity/noBannedTypes: fix later
  props: ComponentProps<ReactWebComponent<YmViz<StateType, EventType>, {}>>,
  // @ts-expect-error
) => <__ReactYmViz {...props} />;
