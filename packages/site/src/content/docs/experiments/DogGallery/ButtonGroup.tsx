import * as stylex from "@stylexjs/stylex";
import type { FC, ReactNode } from "react";
import { colors } from "../../../../styles/starlight.stylex";

const RADIUS = "0.5rem";

const styles = stylex.create({
  group: {
    display: "flex",
  },
  button: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "2.25rem",
    minHeight: "2rem",
    paddingBlock: "0.25rem",
    paddingInline: "0.6rem",
    // neighbours share a border, and only the ends of the group are rounded
    marginLeft: { default: "-2px", ":first-child": 0 },
    borderWidth: "2px",
    borderStyle: "solid",
    borderColor: colors.gray5,
    borderTopLeftRadius: { default: 0, ":first-child": RADIUS },
    borderBottomLeftRadius: { default: 0, ":first-child": RADIUS },
    borderTopRightRadius: { default: 0, ":last-child": RADIUS },
    borderBottomRightRadius: { default: 0, ":last-child": RADIUS },
    backgroundColor: colors.black,
    color: { default: colors.gray2, ":hover": colors.white },
    cursor: "pointer",
  },
  pressed: {
    // so its border is drawn over its neighbours'
    position: "relative",
    borderColor: colors.accent,
    backgroundColor: colors.accentLow,
    color: colors.accentHigh,
    fontWeight: 600,
  },
});

/** A row of buttons joined into one control. */
export const ButtonGroup: FC<{ readonly children: ReactNode }> = ({
  children,
}) => <div {...stylex.props(styles.group)}>{children}</div>;

interface GroupButtonProps {
  readonly title?: string | undefined;
  /** Leave out for a button that does something, rather than toggling. */
  readonly pressed?: boolean;
  readonly onClick: () => void;
  readonly children: ReactNode;
}

export const GroupButton: FC<GroupButtonProps> = ({
  title,
  pressed,
  onClick,
  children,
}) => (
  <button
    {...stylex.props(styles.button, pressed && styles.pressed)}
    type="button"
    aria-pressed={pressed}
    title={title}
    onClick={onClick}
  >
    {children}
  </button>
);
