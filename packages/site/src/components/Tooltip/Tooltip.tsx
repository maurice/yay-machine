import { type FC, type ReactNode, useRef } from "react";
import { CSSTransition } from "react-transition-group";
import "./Tooltip.css";

interface TooltipProps {
  readonly className?: string;
  readonly show?: boolean;
  readonly children: ReactNode;
}

export const Tooltip: FC<TooltipProps> = ({ className, show, children }) => {
  const nodeRef = useRef<HTMLDivElement>(null);

  return (
    <CSSTransition
      nodeRef={nodeRef}
      in={show}
      timeout={500}
      classNames="tooltip"
      unmountOnExit
    >
      <div ref={nodeRef} className={`tooltip ${className ?? ""}`}>
        <div className="tooltip-body">{children}</div>
        <div className="tooltip-arrow" />
      </div>
    </CSSTransition>
  );
};
