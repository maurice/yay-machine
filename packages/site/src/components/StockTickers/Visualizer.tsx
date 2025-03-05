import { type FC, useContext, useState } from "react";
import { TickersContext } from "./TickersContext";

export const Visualizer: FC = () => {
  const { machine } = useContext(TickersContext);
  const [showViz, setShowViz] = useState(false);

  return (
    <>
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
      {machine && showViz && (
        <>
          <div>{JSON.stringify(Object.keys(machine.state.symbols))}</div>
          <div>{JSON.stringify(machine.state.subscriptions)}</div>
        </>
      )}
    </>
  );
};
