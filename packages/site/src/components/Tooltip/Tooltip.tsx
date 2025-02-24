import type { FC, ReactNode } from "react";
import "./Tooltip.css";

interface TooltipProps {
  readonly className?: string;
  readonly children: ReactNode;
}

export const Tooltip: FC<TooltipProps> = ({ className, children }) => {
  return (
    <div className={`tooltip ${className ?? ""}`}>
      <div className="tooltip-body">{children}</div>
      <div className="tooltip-arrow" />
    </div>
  );
};
