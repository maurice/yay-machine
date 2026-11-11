import * as stylex from "@stylexjs/stylex";
import type { TickersState } from "@yay-machine/example-machines";
import { type FC, useContext, useState } from "react";
import { ReactYmViz } from "../../../../../components/ReactYmViz";
import type { MapData } from "../../../../../components/ym";
import { colors } from "../../../../../styles/starlight.stylex";
import { TickersContext } from "./TickersContext";

const styles = stylex.create({
  visualizer: {
    width: "100%",
    marginTop: "1em",
    borderTopWidth: "1px",
    borderTopStyle: "dashed",
    borderTopColor: "lightgray",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  machines: {
    display: "inline-grid",
    gridTemplateColumns: "min-content 1fr",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: colors.gray4,
  },
  machine: {
    display: "contents",
  },
  machineLabel: {
    writingMode: "sideways-lr",
    padding: "1em",
    textAlign: "center",
    borderRightWidth: "1px",
    borderRightStyle: "solid",
    borderRightColor: colors.gray4,
  },
  viz: {
    padding: "1em",
    display: "inline-block",
  },
  notFirst: {
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: colors.gray4,
  },
});

const mapData: MapData<TickersState> = (state) => ({
  symbols: Object.fromEntries(
    Object.entries(state.symbols).map(([symbol]) => [
      symbol,
      `«priceMachine: ${symbol}»`,
    ]),
  ),
  subscriptions: Object.fromEntries(
    Object.entries(state.subscriptions).map(([subId, symbol]) => [
      subId,
      symbol,
    ]),
  ),
});

export const Visualizer: FC = () => {
  const { machine, state } = useContext(TickersContext);
  const [showViz, setShowViz] = useState(true);

  return (
    <>
      <div {...stylex.props(styles.visualizer)}>
        <div>
          <label>
            <input
              type="checkbox"
              checked={showViz}
              onChange={() => setShowViz(!showViz)}
            />
            &nbsp; Show visualizer
          </label>
        </div>
        <div {...stylex.props(styles.machines)}>
          {showViz &&
            (machine ? (
              <div {...stylex.props(styles.machine)}>
                <div {...stylex.props(styles.machineLabel)}>
                  «tickerMachine»
                </div>
                <ReactYmViz
                  {...stylex.props(styles.viz)}
                  machine={machine}
                  mapData={mapData}
                />
              </div>
            ) : (
              <div>Not started</div>
            ))}
          {showViz &&
            state &&
            Object.keys(state.symbols).length > 0 &&
            Object.entries(state.symbols).map(([symbol, price]) => (
              <div {...stylex.props(styles.machine)} key={symbol}>
                <div {...stylex.props(styles.machineLabel, styles.notFirst)}>
                  «priceMachine: {symbol}»
                </div>
                <ReactYmViz
                  {...stylex.props(styles.viz, styles.notFirst)}
                  machine={price}
                  direction="LR"
                />
              </div>
            ))}
        </div>
      </div>
    </>
  );
};
