import { type FC, useEffect, useState } from "react";
import { useMachine } from "../useMachine";
import { keypadMachine } from "./keypad";
import "./Keypad.css";

interface ButtonProps {
  readonly value: string;
  readonly disabled?: boolean;
  readonly onPress: (value: string) => void;
}

const Button: FC<ButtonProps> = ({ value, disabled, onPress }) => {
  const [active, setActive] = useState(false);
  return (
    <button
      className={`keypad-button ${disabled ? "disabled" : ""} ${active ? "active" : ""}`}
      type="button"
      value={value}
      onClick={() => onPress(value)}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
    >
      {value}
    </button>
  );
};

export const Keypad: FC = () => {
  const { state, send } = useMachine(keypadMachine);

  const onKeyPress = (key: string) => {
    send({ type: "KEY_PRESSED", key });
  };

  useEffect(() => {
    if (state.name === "done" || state.name === "inactive") {
      return;
    }

    const listener = (event: KeyboardEvent) => {
      if (!Number.isNaN(Number(event.key)) || event.key === "Enter") {
        send({ type: "KEY_PRESSED", key: event.key.toUpperCase() });
      }
    };

    document.addEventListener("keypress", listener);
    return () => document.removeEventListener("keypress", listener);
  }, [state, send]);

  return (
    <div className="keypad">
      <Button
        value="7"
        disabled={!(state.name === "number" || (state.name === "choose" && state.choices.includes(7)))}
        onPress={onKeyPress}
      />
      <Button
        value="8"
        disabled={!(state.name === "number" || (state.name === "choose" && state.choices.includes(8)))}
        onPress={onKeyPress}
      />
      <Button
        value="9"
        disabled={!(state.name === "number" || (state.name === "choose" && state.choices.includes(9)))}
        onPress={onKeyPress}
      />
      <Button value="CANCEL" disabled={!(state.name === "number" || state.name === "choose")} onPress={onKeyPress} />
      <Button
        value="4"
        disabled={!(state.name === "number" || (state.name === "choose" && state.choices.includes(4)))}
        onPress={onKeyPress}
      />
      <Button
        value="5"
        disabled={!(state.name === "number" || (state.name === "choose" && state.choices.includes(5)))}
        onPress={onKeyPress}
      />
      <Button
        value="6"
        disabled={!(state.name === "number" || (state.name === "choose" && state.choices.includes(6)))}
        onPress={onKeyPress}
      />
      <Button value="DELETE" disabled={!(state.name === "number")} onPress={onKeyPress} />
      <Button
        value="1"
        disabled={!(state.name === "number" || (state.name === "choose" && state.choices.includes(1)))}
        onPress={onKeyPress}
      />
      <Button
        value="2"
        disabled={!(state.name === "number" || (state.name === "choose" && state.choices.includes(2)))}
        onPress={onKeyPress}
      />
      <Button
        value="3"
        disabled={!(state.name === "number" || (state.name === "choose" && state.choices.includes(3)))}
        onPress={onKeyPress}
      />
      <div />
      <div />
      <Button
        value="0"
        disabled={!(state.name === "number" || (state.name === "choose" && state.choices.includes(0)))}
        onPress={onKeyPress}
      />
      <div />
      <Button value="ENTER" disabled={!(state.name === "number" && state.value)} onPress={onKeyPress} />
    </div>
  );
};
