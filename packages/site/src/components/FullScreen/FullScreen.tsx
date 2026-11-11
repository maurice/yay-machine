import { ArrowUUpLeftIcon, FrameCornersIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import {
  type FC,
  type ReactNode,
  startTransition,
  useCallback,
  useEffect,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { colors } from "../../styles/starlight.stylex";
import { notContent } from "../notContent";
import { Tooltip } from "../Tooltip";

interface FullScreenProps {
  readonly children?: ReactNode;
}

const styles = stylex.create({
  wrapper: {
    position: "relative",
    marginTop: "1rem",
  },
  fullScreen: {
    marginBottom: "1rem",
    marginInline: "1rem",
  },
  controls: {
    position: "absolute",
    top: "0.5em",
    right: "0.5em",
  },
  button: {
    opacity: { default: 0.5, ":hover": 1 },
    transition: "0.3s opacity",
    cursor: "pointer",
    width: "26px",
    height: "26px",
    color: colors.textInvert,
    backgroundColor: colors.textAccent,
    borderStyle: "none",
    borderRadius: "3px",
  },
});

export const FullScreen: FC<FullScreenProps> = ({ children }) => {
  const [toggleHovered, setToggleHovered] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);

  const onKeypress = useCallback((event: KeyboardEvent) => {
    if (event.key === "Escape") {
      startTransition(() => {
        setFullScreen(false);
        setToggleHovered(false);
      });
    }
  }, []);

  useEffect(() => {
    if (!fullScreen) {
      return undefined;
    }

    const scrollTop = document.documentElement.scrollTop;
    document.body.classList.add("full-screen");
    document.addEventListener("keydown", onKeypress, true);

    return () => {
      document.removeEventListener("keydown", onKeypress, true);
      document.body.classList.remove("full-screen");
      document.documentElement.scrollTop = scrollTop;
    };
  }, [fullScreen, onKeypress]);

  const toggleFullScreen = useCallback(() => {
    startTransition(() => {
      setFullScreen((wasFullScreen) => !wasFullScreen);
      setToggleHovered(false);
    });
  }, []);

  const content = (
    <div
      {...notContent(styles.wrapper, fullScreen && styles.fullScreen)}
      data-testid="full-screen"
    >
      <div>{children}</div>
      <div
        {...stylex.props(styles.controls)}
        data-testid="full-screen-controls"
      >
        {/* biome-ignore lint/a11y/useKeyWithMouseEvents: <explanation> */}
        <button
          type="button"
          data-testid="full-screen-toggle"
          {...stylex.props(styles.button)}
          onClick={toggleFullScreen}
          onMouseOver={() => setToggleHovered(true)}
          onMouseOut={() => setToggleHovered(false)}
        >
          {fullScreen ? <ArrowUUpLeftIcon /> : <FrameCornersIcon />}
        </button>
      </div>
      <Tooltip show={toggleHovered}>
        {fullScreen ? "Page view" : "Full screen"}
      </Tooltip>
    </div>
  );

  return fullScreen ? createPortal(content, document.body) : content;
};
