export interface CashDispenser {
  /**
   * Dispenses cash to the user
   * @return a Promise that resolves when the cash has been dispensed
   */
  dispenseCash(amount: number): Promise<void>;
}
