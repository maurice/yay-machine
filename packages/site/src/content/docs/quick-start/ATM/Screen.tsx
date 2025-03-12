import type { FC } from "react";
import "./Screen.css";

interface ScreenProps {
  readonly text: string;
}

export const Screen: FC<ScreenProps> = ({ text }) => {
  return <div className="screen">{text}</div>;
};
