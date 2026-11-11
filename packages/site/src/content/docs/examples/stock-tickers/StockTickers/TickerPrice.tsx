import {
  ArrowFatDownIcon,
  ArrowFatUpIcon,
  HourglassHighIcon,
  MinusCircleIcon,
  PlusCircleIcon,
  ProhibitIcon,
} from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import type { PriceState } from "@yay-machine/example-machines";
import { type FC, useContext } from "react";
import { notContent } from "../../../../../components/notContent";
import { colors } from "../../../../../styles/starlight.stylex";
import { useConnected } from "./connected";
import { TickersContext } from "./TickersContext";
import { usePrice } from "./usePrice";

const styles = stylex.create({
  price: {
    display: "contents",
  },
  cell: {
    backgroundColor: colors.black,
    height: "24px",
    padding: "0 4px",
  },
  change: {
    paddingTop: "3px",
  },
  button: {
    backgroundColor: "transparent",
    borderStyle: "none",
    height: "24px",
    color: { default: colors.gray5, ":not(:disabled)": colors.gray1 },
    cursor: { default: null, ":not(:disabled)": "pointer" },
  },
});

const getStateIcon = (state: PriceState | undefined) => {
  if (!state) {
    return null;
  }

  switch (state.name) {
    case "live":
      switch (state.change) {
        case "up":
          return <ArrowFatUpIcon size="18" weight="fill" fill="green" />;

        case "down":
          return <ArrowFatDownIcon size="18" weight="fill" fill="darkred" />;

        default:
          return null;
      }

    case "stale":
      return <ProhibitIcon size="18" fill="#666" />;

    case "pending":
      return <HourglassHighIcon size="18" fill="#666" />;

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
  const price = usePrice(subscribed ? symbol : "none");

  const onClickSubscribeUnsubscribe = () => {
    if (subscribed) {
      onUnsubscribe(symbol);
    } else {
      onSubscribe(symbol);
    }
  };

  return (
    <div {...notContent(styles.price)} data-testid="ticker-price">
      <div {...notContent(styles.cell)}>
        <button
          type="button"
          data-testid="ticker-subscribe-unsubscribe"
          {...stylex.props(styles.button)}
          disabled={!connected || !tickers?.send}
          onClick={onClickSubscribeUnsubscribe}
        >
          {!subscribed ? (
            <PlusCircleIcon size="24" />
          ) : (
            <MinusCircleIcon size="24" />
          )}
        </button>
      </div>
      <div {...notContent(styles.cell)}>{symbol}</div>
      <div {...notContent(styles.cell)} data-testid="ticker-value">
        {!price || price?.name === "pending" ? "" : price.price}
      </div>
      <div {...notContent(styles.cell, styles.change)}>
        {getStateIcon(price)}
      </div>
    </div>
  );
};
