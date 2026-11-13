import * as stylex from "@stylexjs/stylex";
import { type FC, useState } from "react";
import cabUrl from "../../../../assets/elevator/cab.png?url&no-inline";
import doorUrl from "../../../../assets/elevator/door.png?url&no-inline";
import lobbyUrl from "../../../../assets/elevator/lobby.png?url&no-inline";
import { notContent } from "../../../../components/notContent";
import { colors, textSizes } from "../../../../styles/starlight.stylex";

const styles = stylex.create({
  wrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.75rem",
    marginBlock: "1.5rem",
  },
  scene: {
    position: "relative",
    width: "100%",
    maxWidth: "720px",
    aspectRatio: "720 / 500",
    overflow: "hidden",
    backgroundColor: "#222034",
    borderWidth: "2px",
    borderStyle: "solid",
    borderColor: colors.gray5,
    imageRendering: "pixelated",
  },
  carpet: {
    position: "absolute",
    left: "6.9444%",
    top: "60.4%",
    width: "85.9722%",
    height: "11.8%",
    backgroundColor: "#5b6ee1",
  },
  lobby: {
    position: "absolute",
    left: "6.9444%",
    top: "24.2%",
    width: "85.9722%",
    height: "51.6%",
    imageRendering: "pixelated",
  },
  cab: {
    position: "absolute",
    left: "42.9167%",
    top: "40.8%",
    width: "14.1667%",
    height: "19.6%",
    imageRendering: "pixelated",
  },
  leftDoor: {
    position: "absolute",
    left: "42.9167%",
    top: "41%",
    width: "7.0833%",
    height: "19.2%",
    imageRendering: "pixelated",
    transition: "transform 300ms steps(6, end)",
  },
  rightDoor: {
    position: "absolute",
    left: "50%",
    top: "41%",
    width: "7.0833%",
    height: "19.2%",
    imageRendering: "pixelated",
    transform: "scaleX(-1)",
    transition: "transform 300ms steps(6, end)",
  },
  leftOpen: {
    transform: "translateX(-100%)",
  },
  rightOpen: {
    transform: "translateX(100%) scaleX(-1)",
  },
  button: {
    paddingBlock: "0.4rem",
    paddingInline: "0.8rem",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: { default: colors.gray5, ":hover": colors.accent },
    borderRadius: "0.25rem",
    backgroundColor: colors.black,
    color: { default: colors.gray2, ":hover": colors.white },
    fontSize: textSizes.sm,
    cursor: "pointer",
  },
});

export const ElevatorLobby: FC = () => {
  const [doorsOpen, setDoorsOpen] = useState(false);

  return (
    <div {...notContent(styles.wrapper)}>
      <div {...stylex.props(styles.scene)} data-testid="elevator-lobby-scene">
        {/* The lobby facade is drawn last: its transparent doorway shows the cab
            and doors, and its walls hide the doors as they slide open. */}
        <img {...stylex.props(styles.cab)} src={cabUrl} alt="" />
        <div {...stylex.props(styles.carpet)} />
        <img
          {...stylex.props(styles.leftDoor, doorsOpen && styles.leftOpen)}
          src={doorUrl}
          alt=""
        />
        <img
          {...stylex.props(styles.rightDoor, doorsOpen && styles.rightOpen)}
          src={doorUrl}
          alt=""
        />
        <img {...stylex.props(styles.lobby)} src={lobbyUrl} alt="" />
      </div>
      <button
        {...stylex.props(styles.button)}
        type="button"
        aria-pressed={doorsOpen}
        onClick={() => setDoorsOpen((open) => !open)}
      >
        {doorsOpen ? "Close doors" : "Open doors"}
      </button>
    </div>
  );
};
