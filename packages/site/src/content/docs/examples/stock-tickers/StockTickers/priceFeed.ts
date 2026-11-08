export const createPriceFeed = (
  send: (message: string) => void,
  prices: Record<string, number>,
) => {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  const unsubscribe = (symbol: string) => {
    clearTimeout(timers.get(symbol));
    timers.delete(symbol);
  };

  const tickPrice = (symbol: string) => {
    const previousPrice = prices[symbol] ?? Math.random() * 250;
    const price = previousPrice + Math.random() * 2 - 1;
    prices[symbol] = price;
    send(`${symbol}:${price.toFixed(2)}`);
    timers.set(
      symbol,
      setTimeout(() => tickPrice(symbol), Math.random() * 8_000),
    );
  };

  return {
    subscribe(symbol: string) {
      unsubscribe(symbol);
      timers.set(
        symbol,
        setTimeout(() => tickPrice(symbol), 2_000),
      );
    },
    unsubscribe,
    dispose() {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
      timers.clear();
    },
  };
};
