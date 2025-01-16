import { defineMachine } from "yay-machine";

const MIN_TEMP = 0;
const MIN_HEAT = 12;
const MAX_TEMP = 50;

type HeaterState = {
  readonly name: "off" | "selfCheck" | "heat" | "cool" | "error";
  readonly temperature: number;
  readonly integrityCheck: string;
  readonly errorCode?: string;
};

type HeaterEvent =
  | { readonly type: "ON" }
  | { readonly type: "CHECK_OK" }
  | { readonly type: "CHECK_FAILED" }
  | { readonly type: "OFF" }
  | { readonly type: "HOTTER" }
  | { readonly type: "COOLER" };

// simulate some self-diagnostics integrity-check of a physical machine
const isHeaterOk = async (state: HeaterState): Promise<boolean> =>
  state.integrityCheck === "2+2=4";

/**
 * A room-heater/cooler
 */
export const heaterMachine = defineMachine<HeaterState, HeaterEvent>({
  enableCopyDataOnTransition: true,
  initialState: { name: "off", temperature: 21, integrityCheck: "2+2=4" },
  states: {
    off: {
      on: {
        ON: { to: "selfCheck" },
      },
    },
    selfCheck: {
      onEnter: ({ send, state }) => {
        isHeaterOk(state).then((ok) => {
          if (!ok) {
            send({ type: "CHECK_FAILED" });
          } else {
            send({ type: "CHECK_OK" });
          }
        });
      },
      on: {
        CHECK_OK: [
          { to: "heat", when: ({ state }) => state.temperature >= MIN_HEAT },
          { to: "cool" },
        ],
        CHECK_FAILED: {
          to: "error",
          data: ({ state }) => ({ ...state, errorCode: "NOTOK" }),
        },
      },
    },
    heat: {
      on: {
        HOTTER: {
          to: "heat",
          data: ({ state }) => ({
            ...state,
            temperature: state.temperature + 1,
          }),
          when: ({ state }) => state.temperature < MAX_TEMP,
        },
        COOLER: [
          {
            to: "heat",
            data: ({ state }) => ({
              ...state,
              temperature: state.temperature - 1,
            }),
            when: ({ state }) => state.temperature > MIN_HEAT,
          },
          {
            to: "cool",
            data: ({ state }) => ({
              ...state,
              temperature: state.temperature - 1,
            }),
          },
        ],
      },
    },
    cool: {
      on: {
        HOTTER: [
          {
            to: "cool",
            data: ({ state }) => ({
              ...state,
              temperature: state.temperature + 1,
            }),
            when: ({ state }) => state.temperature + 1 < MIN_HEAT,
          },
          {
            to: "heat",
            data: ({ state }) => ({
              ...state,
              temperature: state.temperature + 1,
            }),
          },
        ],
        COOLER: {
          to: "cool",
          data: ({ state }) => ({
            ...state,
            temperature: state.temperature - 1,
          }),
          when: ({ state }) => state.temperature > MIN_TEMP,
        },
      },
    },
  },
  on: {
    OFF: { to: "off" },
  },
});
