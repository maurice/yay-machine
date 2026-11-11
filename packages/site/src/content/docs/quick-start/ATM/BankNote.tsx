import * as stylex from "@stylexjs/stylex";
import type { FC, Ref } from "react";

interface BankNoteProps {
  readonly xstyle?: stylex.StyleXStyles | undefined;
  readonly ref?: Ref<HTMLDivElement> | undefined;
  readonly amount: number;
}

const styles = stylex.create({
  note: {
    width: "450px",
    backgroundColor: "#f1f1e9",
    padding: "0 10px 10px 10px",
  },
  detail: {
    height: "60px",
    borderStyle: "solid",
    borderWidth: "0 15px 15px 15px",
    borderColor: "rgb(54, 81, 54)",
    position: "relative",
  },
  amount: {
    position: "absolute",
    display: "inline",
    fontFamily: "serif",
    fontWeight: "bold",
    padding: "0.5em",
    borderRadius: "20px",
    backgroundColor: "rgb(54, 81, 54)",
    color: "white",
    borderWidth: "2px",
    borderStyle: "solid",
    borderColor: "white",
    bottom: "-5px",
  },
  left: { left: "-5px" },
  right: { right: "-5px" },
});

export const BankNote: FC<BankNoteProps> = ({ xstyle, ref, amount }) => {
  return (
    <div ref={ref} {...stylex.props(styles.note, xstyle)}>
      <div {...stylex.props(styles.detail)}>
        <div {...stylex.props(styles.amount, styles.left)}>{amount}</div>
        <div {...stylex.props(styles.amount, styles.right)}>{amount}</div>
      </div>
    </div>
  );
};
