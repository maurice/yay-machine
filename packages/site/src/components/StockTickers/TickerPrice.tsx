import {
  ArrowFatDown,
  ArrowFatUp,
  HourglassHigh,
  MinusCircle,
  PlusCircle,
  Prohibit,
} from "@phosphor-icons/react";
import type { PriceState } from "@yay-machine/example-machines";
import { type FC, useContext, useEffect, useState } from "react";
import { TickersContext } from "./TickersContext";
import { useConnected } from "./connected";
import "./TickerPrice.css";

const getStateIcon = (state: PriceState | undefined) => {
  if (!state) {
    return null;
  }

  switch (state.name) {
    case "live":
      switch (state.change) {
        case "up":
          return <ArrowFatUp size="18" weight="fill" fill="green" />;

        case "down":
          return <ArrowFatDown size="18" weight="fill" fill="darkred" />;

        default:
          return null;
      }

    case "stale":
      return <Prohibit size="18" fill="#666" />;

    case "pending":
      return <HourglassHigh size="18" fill="#666" />;

    default:
      return null;
  }
};

interface TickerPriceProps {
  readonly symbol: string;
  readonly subscribed: boolean;
  readonly onSubscribe: (symbol: string) => void;
  readonly onUnsubscribe: (symbol: string) => void;
}

export const TickerPrice: FC<TickerPriceProps> = ({
  symbol,
  subscribed,
  onSubscribe,
  onUnsubscribe,
}) => {
  const [connected] = useConnected();
  const tickers = useContext(TickersContext);
  const [price, setPrice] = useState<PriceState | undefined>();

  useEffect(() => {
    const price = subscribed && tickers?.state?.symbols[symbol];
    if (!price) {
      setPrice(undefined);
      return;
    }

    return price.subscribe(({ state }) => setPrice(state));
  }, [symbol, subscribed, tickers.state?.symbols[symbol]]);

  const onClickSubscribeUnsubscribe = () => {
    if (subscribed) {
      onUnsubscribe(symbol);
    } else {
      onSubscribe(symbol);
    }
  };

  return (
    <div
      className={`ticker-price ticker-price__${price?.name ?? ""} ${price?.name === "stale" ? "ticker-price__stale" : ""} ${price?.name === "live" ? `ticker-price__${price.change}` : ""} not-content`}
    >
      <div className="ticker-subscribe-unsubscribe ticker-cell not-content">
        <button
          type="button"
          disabled={!connected}
          onClick={onClickSubscribeUnsubscribe}
        >
          {!subscribed ? <PlusCircle size="24" /> : <MinusCircle size="24" />}
        </button>
      </div>
      <div className="ticker-symbol ticker-cell not-content">{symbol}</div>
      <div className="ticker-value ticker-cell not-content">
        {!price || price?.name === "pending" ? "" : price.price}
      </div>
      <div className="ticker-change ticker-cell not-content">
        {getStateIcon(price)}
      </div>
    </div>
  );
};
