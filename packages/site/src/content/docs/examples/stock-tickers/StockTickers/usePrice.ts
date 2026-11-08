import type { PriceState } from "@yay-machine/example-machines";
import { useCallback, useContext, useSyncExternalStore } from "react";
import { TickersContext } from "./TickersContext";

export const usePrice = (symbol: string): PriceState | undefined => {
  const tickers = useContext(TickersContext);
  const price = tickers?.state?.symbols[symbol];
  const subscribe = useCallback(
    (onStoreChange: () => void) =>
      price?.subscribe(onStoreChange) ?? (() => {}),
    [price],
  );
  const getSnapshot = useCallback(() => price?.state, [price]);

  return useSyncExternalStore(subscribe, getSnapshot, () => undefined);
};
