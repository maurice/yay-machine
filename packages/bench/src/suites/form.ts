import { createActor } from "xstate";
import type { ThroughputSuite } from "../types";
import {
  type FormView,
  defineXStateForm,
  defineYayForm,
  formSession,
  newFormCounts,
  renderForm,
} from "../workloads/form";

export const form: ThroughputSuite = {
  kind: "throughput",
  id: "form",
  title: "UI: sign-up form",
  category: "workload",
  description:
    "A subscribed UI form session: per-keystroke data updates, validation via an immediate transition, a failed then successful submit request (with abort cleanup), and reset.",
  variants: [
    {
      id: "session",
      label: `form session (${formSession.length} events)`,
      op: `${formSession.length} events`,
      unit: "events/s",
      unitsPerOp: formSession.length,
      setup: {
        xstate: () => {
          const counts = newFormCounts();
          const actor = createActor(defineXStateForm(counts));
          let view: FormView | undefined;
          actor.subscribe((snapshot) => {
            // oxlint-disable-next-line typescript/no-base-to-string -- the form machine is flat, so the value is always a state name
            view = renderForm(String(snapshot.value), snapshot.context);
          });
          actor.start();
          return {
            run: () => {
              for (const event of formSession) {
                actor.send(event);
              }
            },
            observe: () => ({
              state: actor.getSnapshot().value,
              ...actor.getSnapshot().context,
              ...counts,
              view,
            }),
          };
        },
        "yay-machine": () => {
          const counts = newFormCounts();
          const machine = defineYayForm(counts).newInstance();
          let view: FormView | undefined;
          machine.subscribe(({ state }) => {
            view = renderForm(state.name, state);
          });
          machine.start();
          return {
            run: () => {
              for (const event of formSession) {
                machine.send(event);
              }
            },
            observe: () => {
              const { name, fullName, ...data } = machine.state;
              return { state: name, name: fullName, ...data, ...counts, view };
            },
          };
        },
      },
    },
  ],
};
