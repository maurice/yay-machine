import { type FC, useContext } from "react";
import { useConnected } from "./connected";
import { TickersContext } from "./TickersContext";
import "./ConnectionControls.css";

export const ConnectionControls: FC = () => {
  const tickers = useContext(TickersContext);
  const [connected, setConnected] = useConnected();

  const onConnect = () => {
    setConnected(true);
  };

  const onDisconnect = () => {
    setConnected(false);
  };

  return (
    <div className="start-stop">
      <button
        type="button"
        disabled={connected || tickers?.interceptorError !== undefined}
        onClick={onConnect}
      >
        Connect
      </button>
      <button
        type="button"
        disabled={
          !connected ||
          (tickers?.state && Object.keys(tickers?.state.symbols).length > 0)
        }
        onClick={onDisconnect}
      >
        Disconnect
      </button>
      {tickers?.interceptorError !== undefined && (
        <p role="alert">
          Unable to load the simulated price feed. Reload to try again.{" "}
          {tickers.interceptorError}
        </p>
      )}
    </div>
  );
};
