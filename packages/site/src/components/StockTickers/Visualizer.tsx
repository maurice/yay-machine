import type { TickersState } from "@yay-machine/example-machines";
import { type FC, useContext, useState } from "react";
import { ReactYmViz } from "../ReactYmViz";
import type { MapData } from "../ym";
import { TickersContext } from "./TickersContext";
import "./Visualizer.css";

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
      <div className="visualizer">
        <div className="viz-controls">
          <label>
            <input
              type="checkbox"
              checked={showViz}
              onChange={() => setShowViz(!showViz)}
            />
            &nbsp; Show visualizer
          </label>
        </div>
        <div className="machines">
          {showViz &&
            (machine ? (
              <div className="machine">
                <div className="machine-label">«tickerMachine»</div>
                <ReactYmViz machine={machine} mapData={mapData} />
              </div>
            ) : (
              <div>Not started</div>
            ))}
          {showViz &&
            state &&
            Object.keys(state.symbols).length > 0 &&
            Object.entries(state.symbols).map(([symbol, price]) => (
              <div className="machine" key={symbol}>
                <div className="machine-label">«priceMachine: {symbol}»</div>
                <ReactYmViz
                  machine={price}
                  direction="LR"
                  mapData={({ name, ...state }) => state}
                />
              </div>
            ))}
        </div>
      </div>
    </>
  );
};
