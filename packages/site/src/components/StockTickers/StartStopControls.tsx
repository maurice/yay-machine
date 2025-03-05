import { type FC, useContext, useState } from "react";
import { TickersContext } from "./TickersContext";
import "./StartStopControls.css";

export const StartStopControls: FC = () => {
  const [started, setStarted] = useState(false);
  const tickers = useContext(TickersContext);

  const onStart = () => {
    tickers?.start?.();
    setStarted(true);
  };

  const onStop = () => {
    tickers?.stop?.();
    setStarted(false);
  };

  return (
    <div className="start-stop">
      {
        <button
          type="button"
          disabled={!tickers?.start || started}
          onClick={onStart}
        >
          Start
        </button>
      }
      {
        <button
          type="button"
          disabled={
            !tickers?.stop ||
            !started ||
            (tickers?.state && Object.keys(tickers?.state.symbols).length > 0)
          }
          onClick={onStop}
        >
          Stop
        </button>
      }
    </div>
  );
};
