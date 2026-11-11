import * as stylex from "@stylexjs/stylex";
import type { FC } from "react";
import { colors } from "../../../../styles/starlight.stylex";

interface ScreenProps {
  readonly text: string;
}

// credit to https://medium.com/@dovid11564/using-css-animations-to-mimic-the-look-of-a-crt-monitor-3919de3318e2
const scanlines = stylex.keyframes({
  from: { backgroundPosition: "0 0" },
  to: { backgroundPosition: "0 -10px" },
});

const styles = stylex.create({
  screen: {
    width: "400px",
    height: "300px",
    borderWidth: "2px",
    borderStyle: "solid",
    borderColor: colors.gray5,
    backgroundImage:
      "linear-gradient(to top, #000000, #000000, #333333, #333333)",
    backgroundSize: "100% 1px",
    color: "#00ff00",
    fontFamily: '"Courier New", monospace',
    fontSize: "20px",
    textAlign: "center",
    textShadow: "0 0 10px #00ff00",
    padding: "1em",
    borderRadius: "10px",
    filter: "blur(0.3px)",
    whiteSpace: "pre",
    animationName: { default: null, "@media screen": scanlines },
    animationDuration: { default: null, "@media screen": "55s" },
    animationIterationCount: { default: null, "@media screen": "infinite" },
    animationTimingFunction: { default: null, "@media screen": "linear" },
  },
});

export const Screen: FC<ScreenProps> = ({ text }) => {
  return (
    <div {...stylex.props(styles.screen)} data-testid="screen">
      {text}
    </div>
  );
};
