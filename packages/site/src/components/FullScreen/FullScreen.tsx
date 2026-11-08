import { ArrowUUpLeft, FrameCorners } from "@phosphor-icons/react";
import {
  type FC,
  type ReactNode,
  startTransition,
  useCallback,
  useEffect,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Tooltip } from "../Tooltip";
import "./FullScreen.css";

interface FullScreenProps {
  readonly children?: ReactNode;
}

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
      className={`full-screen-wrapper not-content ${fullScreen ? "is-full-screen" : ""}`}
    >
      <div>{children}</div>
      <div className="full-screen__controls">
        {/* biome-ignore lint/a11y/useKeyWithMouseEvents: <explanation> */}
        <button
          type="button"
          onClick={toggleFullScreen}
          onMouseOver={() => setToggleHovered(true)}
          onMouseOut={() => setToggleHovered(false)}
        >
          {fullScreen ? <ArrowUUpLeft /> : <FrameCorners />}
        </button>
      </div>
      <Tooltip show={toggleHovered}>
        {fullScreen ? "Page view" : "Full screen"}
      </Tooltip>
    </div>
  );

  return fullScreen ? createPortal(content, document.body) : content;
};
