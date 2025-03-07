import type { PriceState } from "@yay-machine/example-machines";
import { useContext, useEffect, useState } from "react";
import { TickersContext } from "./TickersContext";

export const usePrice = (symbol: string) => {
  const tickers = useContext(TickersContext);
  const [price, setPrice] = useState<PriceState | undefined>();
  useEffect(() => {
    setPrice(tickers?.state?.symbols[symbol]?.state);
  }, [tickers, symbol]);
  return price;
};
