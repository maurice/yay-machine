export interface Keypad {
  /**
   * Request the user to enter a single digit number from the available choices
   * @param allowed the set of allowed numbers the user may enter
   * @return a Promise which either resolves to the number they entered,
   *         or rejects if they decide to cancel the transaction
   */
  readChoice<Choice extends number>(
    allowed: readonly Choice[],
  ): Promise<Choice>;

  /**
   * Request the user to enter a multi-digit number
   * @return a Promise which either resolves to the number they entered,
   *         or rejects if they decide to cancel the transaction
   */
  readNumber(mask: boolean): Promise<number>;
}
