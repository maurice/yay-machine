import * as stylex from "@stylexjs/stylex";
import type { FC } from "react";

const styles = stylex.create({
  swatch: (colour: string) => ({
    display: "inline-block",
    width: "0.7rem",
    height: "0.7rem",
    borderRadius: "2px",
    backgroundColor: colour,
  }),
});

/** A little square of a guide's colour, to say which line is which. */
export const Swatch: FC<{ readonly colour: string }> = ({ colour }) => (
  <span {...stylex.props(styles.swatch(colour))} />
);
