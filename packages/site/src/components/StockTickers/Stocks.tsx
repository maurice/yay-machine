import { type FC, useContext, useState } from "react";
import { TickerPrice } from "./TickerPrice";
import { TickersContext } from "./TickersContext";
import { getSubscriptionId } from "./getSubscriptionId";
import { SYMBOLS } from "./symbols";
import "./Stocks.css";

export const Stocks: FC = () => {
  const [subscribed, setSubscribed] = useState<
    Record</* symbol */ string, /* subscriptionId */ string>
  >({});
  const tickers = useContext(TickersContext);

  const onSubscribe = (symbol: string) => {
    const subscriptionId = getSubscriptionId();
    tickers?.send?.({ type: "ADD_TICKER", symbol, subscriptionId });
    setSubscribed((subscribed) => ({
      ...subscribed,
      [symbol]: subscriptionId,
    }));
  };

  const onUnsubscribe = (symbol: string) => {
    tickers?.send?.({
      type: "REMOVE_TICKER",
      subscriptionId: subscribed[symbol],
    });
    setSubscribed(({ [symbol]: _, ...subscribed }) => subscribed);
  };

  return (
    <div className="stocks not-content">
      <div className="tickers">
        {SYMBOLS.map((symbol) => (
          <TickerPrice
            key={symbol}
            symbol={symbol}
            subscribed={symbol in subscribed}
            onSubscribe={onSubscribe}
            onUnsubscribe={onUnsubscribe}
          />
        ))}
      </div>
    </div>
  );
};
