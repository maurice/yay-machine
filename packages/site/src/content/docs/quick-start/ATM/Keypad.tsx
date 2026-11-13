import * as stylex from "@stylexjs/stylex";
import { type FC, useEffect, useState } from "react";
import { useMachine } from "../../../../components/useMachine";
import { colors } from "../../../../styles/starlight.stylex";
import { keypadMachine } from "./keypad";

const styles = stylex.create({
  keypad: {
    display: "grid",
    gridTemplateColumns: "0.5fr 0.5fr 0.5fr 1fr",
    gridTemplateRows: "0.5fr 0.5fr 0.5fr 0.5fr",
    gap: "0px 0px",
    gridTemplateAreas: '". . . ." ". . . ." ". . . ." ". . . ."',
  },
  button: {
    cursor: "pointer",
    margin: "2px",
    backgroundColor: colors.gray5,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: colors.gray1,
    borderRadius: "3px",
  },
  disabled: {
    backgroundColor: colors.gray6,
    borderColor: colors.gray5,
    color: colors.gray5,
    cursor: "default",
  },
  enabled: {
    backgroundColor: { default: colors.gray5, ":hover": colors.gray5 },
  },
  active: {
    backgroundColor: colors.gray7,
  },
});

interface ButtonProps {
  readonly value: string;
  readonly disabled?: boolean;
  readonly onPress: (value: string) => void;
}

const Button: FC<ButtonProps> = ({ value, disabled, onPress }) => {
  const [active, setActive] = useState(false);
  return (
    <button
      {...stylex.props(
        styles.button,
        disabled ? styles.disabled : styles.enabled,
        !disabled && active && styles.active,
      )}
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
      return undefined;
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
    <div {...stylex.props(styles.keypad)}>
      <Button
        value="7"
        disabled={
          !(
            state.name === "number" ||
            (state.name === "choose" && state.choices.includes(7))
          )
        }
        onPress={onKeyPress}
      />
      <Button
        value="8"
        disabled={
          !(
            state.name === "number" ||
            (state.name === "choose" && state.choices.includes(8))
          )
        }
        onPress={onKeyPress}
      />
      <Button
        value="9"
        disabled={
          !(
            state.name === "number" ||
            (state.name === "choose" && state.choices.includes(9))
          )
        }
        onPress={onKeyPress}
      />
      <Button
        value="CANCEL"
        disabled={!(state.name === "number" || state.name === "choose")}
        onPress={onKeyPress}
      />
      <Button
        value="4"
        disabled={
          !(
            state.name === "number" ||
            (state.name === "choose" && state.choices.includes(4))
          )
        }
        onPress={onKeyPress}
      />
      <Button
        value="5"
        disabled={
          !(
            state.name === "number" ||
            (state.name === "choose" && state.choices.includes(5))
          )
        }
        onPress={onKeyPress}
      />
      <Button
        value="6"
        disabled={
          !(
            state.name === "number" ||
            (state.name === "choose" && state.choices.includes(6))
          )
        }
        onPress={onKeyPress}
      />
      <Button
        value="DELETE"
        disabled={!(state.name === "number")}
        onPress={onKeyPress}
      />
      <Button
        value="1"
        disabled={
          !(
            state.name === "number" ||
            (state.name === "choose" && state.choices.includes(1))
          )
        }
        onPress={onKeyPress}
      />
      <Button
        value="2"
        disabled={
          !(
            state.name === "number" ||
            (state.name === "choose" && state.choices.includes(2))
          )
        }
        onPress={onKeyPress}
      />
      <Button
        value="3"
        disabled={
          !(
            state.name === "number" ||
            (state.name === "choose" && state.choices.includes(3))
          )
        }
        onPress={onKeyPress}
      />
      <div />
      <div />
      <Button
        value="0"
        disabled={
          !(
            state.name === "number" ||
            (state.name === "choose" && state.choices.includes(0))
          )
        }
        onPress={onKeyPress}
      />
      <div />
      <Button
        value="ENTER"
        disabled={!(state.name === "number" && state.value)}
        onPress={onKeyPress}
      />
    </div>
  );
};
