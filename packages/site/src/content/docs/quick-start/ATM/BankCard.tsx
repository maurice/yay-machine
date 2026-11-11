import * as stylex from "@stylexjs/stylex";
import type { FC, Ref } from "react";

interface BankCardProps {
  readonly xstyle?: stylex.StyleXStyles | undefined;
  readonly ref?: Ref<HTMLDivElement> | undefined;
  readonly cardNumber: string;
  readonly hidden?: boolean;
  readonly inert?: boolean;
  readonly style?: "coral" | "blueviolet" | "darkcyan" | undefined;
  readonly onClick?: ((cardNumber: string) => void) | undefined;
}

const styles = stylex.create({
  card: {
    width: "150px",
    height: "80px",
    fontFamily: '"Courier New", monospace',
    paddingLeft: "5px",
    backgroundColor: "darkcyan",
    color: "white",
    borderRadius: "5px",
  },
  coral: { backgroundColor: "coral" },
  blueviolet: { backgroundColor: "blueviolet" },
  hidden: { visibility: "hidden" },
  clickable: { cursor: "pointer" },
});

export const BankCard: FC<BankCardProps> = ({
  xstyle,
  ref,
  cardNumber,
  hidden,
  inert,
  style,
  onClick,
}) => {
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: <explanation>
    <div
      ref={ref}
      {...stylex.props(
        styles.card,
        style === "coral" && styles.coral,
        style === "blueviolet" && styles.blueviolet,
        hidden && styles.hidden,
        onClick && styles.clickable,
        xstyle,
      )}
      data-testid="bank-card"
      data-style={style}
      data-inert={inert || undefined}
      onClick={() => onClick?.(cardNumber)}
    >
      {cardNumber}
    </div>
  );
};
