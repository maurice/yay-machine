import * as stylex from "@stylexjs/stylex";
import { type FC, type ReactNode, useRef } from "react";
import { Transition } from "react-transition-group";
import { colors } from "../../styles/starlight.stylex";

interface TooltipProps {
  readonly xstyle?: stylex.StyleXStyles;
  readonly show?: boolean;
  readonly children: ReactNode;
}

const FADE = "opacity 0.5s, transform 0.5s";

const styles = stylex.create({
  tooltip: {
    position: "absolute",
    top: "2px",
    right: "3em",
    color: colors.gray6,
    fontSize: "smaller",
    zIndex: 10,
  },
  body: {
    backgroundColor: colors.gray1,
    display: "inline-block",
    padding: "0.5em 1em",
    borderRadius: "5px",
  },
  arrow: {
    boxSizing: "content-box",
    display: "inline-block",
    width: 0,
    height: 0,
    borderTopWidth: "5px",
    borderTopStyle: "solid",
    borderTopColor: "transparent",
    borderBottomWidth: "5px",
    borderBottomStyle: "solid",
    borderBottomColor: "transparent",
    borderLeftWidth: "10px",
    borderLeftStyle: "solid",
    borderLeftColor: colors.gray1,
  },
});

const phase = stylex.create({
  exited: { opacity: 0, transform: "translateY(10%)" },
  entering: { opacity: 1, transform: "translateY(0)", transition: FADE },
  entered: { opacity: 1, transform: "none" },
  exiting: { opacity: 0, transform: "translateY(10%)", transition: FADE },
  unmounted: {},
});

export const Tooltip: FC<TooltipProps> = ({ xstyle, show, children }) => {
  const nodeRef = useRef<HTMLDivElement>(null);

  return (
    <Transition
      nodeRef={nodeRef}
      in={show}
      timeout={500}
      unmountOnExit
      // flush the `exited` styles so that `entering` animates from them
      onEnter={() => void nodeRef.current?.offsetHeight}
    >
      {(status) => (
        <div
          ref={nodeRef}
          {...stylex.props(styles.tooltip, phase[status], xstyle)}
        >
          <div {...stylex.props(styles.body)}>{children}</div>
          <div {...stylex.props(styles.arrow)} />
        </div>
      )}
    </Transition>
  );
};
