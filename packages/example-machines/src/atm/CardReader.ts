type RemoveListener = () => void;

export interface CardReader {
  /**
   * Register a listener for the "card inserted" event
   */
  addCardInsertedListener(callback: () => void): RemoveListener;

  /**
   * Reads the card-number from the currently inserted card
   * @returns a Promise which resolves to the card-number,
   *          or rejects if the card is unreadable
   */
  readCard(): Promise<string>;

  /**
   * Eject the card
   */
  ejectCard(): Promise<void>;
}
