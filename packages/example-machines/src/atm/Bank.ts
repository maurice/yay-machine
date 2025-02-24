export const BankWithdrawalErrorReason = {
  INVALID_CARD: "Invalid card",
  INVALID_PIN: "Invalid pin",
  INSUFFICIENT_FUNDS: "Insufficient funds",
} as const;

export interface Bank {
  /**
   * Begins a cash withdrawal transaction
   * @return a Promise which either resolves to a transaction-ID or rejects if invalid
   */
  beginCashWithdrawal(
    cardNumber: string,
    pin: number,
    amount: number,
  ): Promise<string>;

  /**
   * Commits the cash withdrawal transaction with the given transaction-ID
   */
  commitCashWithdrawn(transactionId: string): void;
}
