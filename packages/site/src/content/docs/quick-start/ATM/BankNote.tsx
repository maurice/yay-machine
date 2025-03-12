import type { FC } from "react";
import "./BankNote.css";

interface BankNoteProps {
  readonly amount: number;
}

export const BankNote: FC<BankNoteProps> = ({ amount }) => {
  return (
    <div className="bank-note">
      <div className="detail">
        <div className="amount">{amount}</div>
        <div className="amount">{amount}</div>
      </div>
    </div>
  );
};
