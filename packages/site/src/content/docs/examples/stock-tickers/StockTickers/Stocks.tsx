import * as stylex from "@stylexjs/stylex";
import { type FC, useContext, useState } from "react";
import { notContent } from "../../../../../components/notContent";
import { colors } from "../../../../../styles/starlight.stylex";
import { getSubscriptionId } from "./getSubscriptionId";
import { SYMBOLS } from "./symbols";
import { TickerPrice } from "./TickerPrice";
import { TickersContext } from "./TickersContext";

const styles = stylex.create({
  tickers: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    maxWidth: "fit-content",
    gap: "1px",
    backgroundColor: colors.gray4,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: colors.gray4,
  },
});

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
    <div {...notContent()} data-testid="stocks">
      <div {...stylex.props(styles.tickers)}>
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
