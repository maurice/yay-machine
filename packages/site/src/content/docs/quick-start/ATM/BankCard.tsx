import type { FC } from "react";
import "./BankCard.css";

interface BankCardProps {
  readonly className?: string | undefined;
  readonly cardNumber: string;
  readonly hidden?: boolean;
  readonly style?: "coral" | "blueviolet" | "darkcyan" | undefined;
  readonly onClick?: ((cardNumber: string) => void) | undefined;
}

export const BankCard: FC<BankCardProps> = ({
  className,
  cardNumber,
  hidden,
  style,
  onClick,
}) => {
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: <explanation>
    <div
      className={`bank-card ${onClick ? "clickable" : ""} ${hidden ? "hidden" : ""} ${className ?? ""}`}
      data-style={style}
      onClick={() => onClick?.(cardNumber)}
    >
      {cardNumber}
    </div>
  );
};
