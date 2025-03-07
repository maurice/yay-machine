import { LitElement, html } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import { ifDefined } from "lit/directives/if-defined.js";
import {
  type MachineEvent,
  type MachineInstance,
  type MachineState,
  type Unsubscribe,
  YayMachine,
} from "yay-machine";
import type { YmChart } from "./YmChart";
import { Direction } from "./types";

interface Transition {
  readonly from: string;
  readonly to: string;
  readonly label: string;
}

export type MapData<StateType extends MachineState> = (
  state: StateType,
) => object;

@customElement("ym-viz")
export class YmViz<
  StateType extends MachineState,
  EventType extends MachineEvent,
> extends LitElement {
  #unsubscribe: Unsubscribe | undefined;
  #machine: MachineInstance<StateType, EventType> | undefined;

  get machine(): MachineInstance<StateType, EventType> | undefined {
    return this.#machine;
  }

  set machine(machine: MachineInstance<StateType, EventType> | undefined) {
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;

    this.#machine = machine;

    const mdc = machine?.[YayMachine.subtle.MDC];
    this.initial = mdc?.initialState.name;
    const states: string[] = [];
    const transitions: Transition[] = [];
    if (mdc) {
      states.push(mdc.initialState.name);
      if (mdc.states) {
        // biome-ignore lint/suspicious/noExplicitAny: should be fine
        for (const [name, state] of Object.entries<any>(mdc.states)) {
          states.push(name);
          if (state && "on" in state) {
            for (const [event, stateTransitions] of Object.entries(state.on!)) {
              const tr = Array.isArray(stateTransitions)
                ? stateTransitions
                : [stateTransitions];
              for (const t of tr) {
                const to = "to" in t && t.to;
                if (to) {
                  states.push(to);
                }
                transitions.push({ from: name, to: to || name, label: event });
              }
            }
          }
          if (state && "always" in state!) {
            const alwaysTransitions = Array.isArray(state.always)
              ? state.always
              : [state.always];
            for (const t of alwaysTransitions) {
              const to = "to" in t && t.to;
              if (to) {
                states.push(to);
              }
              transitions.push({
                from: name,
                to: to || name,
                label: "(immediate)",
              });
            }
          }
        }
      }

      const allStatesTransitions: Pick<Transition, "to" | "label">[] = [];
      if ("on" in mdc) {
        for (const [event, transitions] of Object.entries(mdc.on!)) {
          const tr = Array.isArray(transitions) ? transitions : [transitions];
          for (const t of tr) {
            const to = "to" in t && t.to;
            if (to) {
              states.push(to);
            }
            allStatesTransitions.push({
              to: to || "CURRENT_STATE",
              label: event,
            });
          }
        }
      }

      for (const state of states) {
        for (const allStatesTransition of allStatesTransitions) {
          const from = state;
          const to =
            allStatesTransition.to === "CURRENT_STATE"
              ? state
              : allStatesTransition.to;
          const label = allStatesTransition.label;
          if (
            !transitions.some(
              (it) => it.from === from && it.to === to && it.label === label,
            )
          ) {
            transitions.push({ from: state, to, label });
          }
        }
      }

      this.states = [...new Set(states)];
      this.transitions = transitions;
      this.end = states.filter(
        (it) => !transitions.some(({ from, to }) => from === it && to !== it),
      );
    }
    this.current = machine?.state.name;

    if (machine) {
      if (this.chart) {
        this.chart.data = this.#mapData?.(machine.state) ?? machine.state;
      }
      this.#unsubscribe = machine.subscribe(({ state, event }) => {
        this.chart?.transition(
          state.name,
          this.#mapData?.(machine.state) ?? machine.state,
          event?.type || "(immediate)",
        );
      });
    }
  }

  #mapData: MapData<StateType> | undefined;

  set mapData(mapData: MapData<StateType> | undefined) {
    this.#mapData = mapData;
    if (this.chart) {
      this.chart.data = this.#machine
        ? this.#mapData?.(this.#machine.state)
        : undefined;
    }
  }

  @property({
    type: String,
    converter(value) {
      switch (value) {
        case Direction.LR:
        case Direction.TB:
          return value;

        default:
          return Direction.TB;
      }
    },
  })
  direction: Direction = Direction.TB;

  @property({ type: Number })
  nodesep: number | undefined;

  @property({ type: Number })
  edgesep: number | undefined;

  @property({ type: Boolean })
  compact = false;

  @property({ type: String })
  initial: string | undefined;

  @property({ type: String })
  current: string | undefined;

  @property({ type: Array })
  end: readonly string[] = [];

  @property({ type: Array })
  states: readonly string[] | undefined;

  @property({ type: Array })
  transitions: readonly Transition[] | undefined;

  @query("ym-chart")
  chart: YmChart | undefined;

  render() {
    return html`<ym-chart
      direction=${this.direction}
      nodesep=${ifDefined(this.nodesep)}
      edgesep=${ifDefined(this.edgesep)}
      start=${ifDefined(this.initial)}
      current=${ifDefined(this.current)}
      .data=${this.machine
        ? (this.#mapData?.(this.machine.state) ?? this.machine.state)
        : undefined}
      .end=${this.end}
    >
      ${this.states?.map(
        (state) => html`<ym-state name=${state} ?compact=${this.compact} />`,
      )}
      ${this.transitions?.map(
        (t) =>
          html`<ym-transition
            from=${t.from}
            to=${t.to}
            label=${t.label}
            ?compact=${this.compact}
          />`,
      )}
    </ym-chart>`;
  }
}
