import * as stylex from "@stylexjs/stylex";
import type { FC, ReactNode } from "react";
import { colors, textSizes } from "../../../../styles/starlight.stylex";

const styles = stylex.create({
  control: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
    margin: 0,
    padding: 0,
    borderStyle: "none",
  },
  legend: {
    marginBottom: "0.25rem",
    padding: 0,
    color: colors.gray3,
    fontSize: textSizes.xs,
    fontWeight: 600,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
  },
});

interface ControlProps {
  readonly label: string;
  readonly children: ReactNode;
}

/** One labelled group in the gallery's control panel. */
export const Control: FC<ControlProps> = ({ label, children }) => (
  <fieldset {...stylex.props(styles.control)}>
    <legend {...stylex.props(styles.legend)}>{label}</legend>
    {children}
  </fieldset>
);
