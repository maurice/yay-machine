import type { FC, ReactNode } from "react";
import { TickersContext } from "./TickersContext";
import { useTickers } from "./useTickers";

interface TickersProviderProps {
  readonly children: ReactNode;
}

export const TickersProvider: FC<TickersProviderProps> = ({ children }) => {
  const tickers = useTickers();
  return (
    <TickersContext.Provider value={tickers}>
      {children}
    </TickersContext.Provider>
  );
};
