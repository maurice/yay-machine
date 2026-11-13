import * as stylex from "@stylexjs/stylex";
import { type FC, useState } from "react";
import cabUrl from "../../../../assets/elevator/cab.png?url&no-inline";
import doorUrl from "../../../../assets/elevator/door.png?url&no-inline";
import lobbyUrl from "../../../../assets/elevator/lobby.png?url&no-inline";
import { notContent } from "../../../../components/notContent";
import { colors, textSizes } from "../../../../styles/starlight.stylex";

// The same 720×500 coordinates that the percentages below are based on.
const SCENE_WIDTH = 720;
const SCENE_HEIGHT = 500;
const LOBBY_X = 50;
const LOBBY_Y = 121;

// Each floor's carpet and floor-number colour, from the old Pixi demo.
const FLOOR_COLOURS = [
  "#5b6ee1",
  "#37946e",
  "#8f563b",
  "#3f3f74",
  "#8f974a",
  "#d77bba",
  "#8f563b",
  "#4b692f",
  "#663931",
  "#306082",
  "#ac3232",
  "#639bff",
] as const;

// Same as the elevator machine's doorsOpening/doorsClosing time.
const DOOR_TRAVEL_MS = 5000;
// One step per art pixel of the 51px-wide door.
const DOOR_TRAVEL_STEPS = 51;
// Only the slide is animated; the right door's mirroring must never transition.
const doorTransition = `translate ${DOOR_TRAVEL_MS}ms steps(${DOOR_TRAVEL_STEPS}, end)`;

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
  },
  floorColour: (colour: string) => ({
    backgroundColor: colour,
  }),
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
    transition: doorTransition,
  },
  rightDoor: {
    position: "absolute",
    left: "50%",
    top: "41%",
    width: "7.0833%",
    height: "19.2%",
    imageRendering: "pixelated",
    scale: "-1 1",
    transition: doorTransition,
  },
  leftOpen: {
    translate: "-100% 0",
  },
  rightOpen: {
    translate: "100% 0",
  },
  overlay: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
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

interface ElevatorLobbyProps {
  readonly floor?: number;
}

export const ElevatorLobby: FC<ElevatorLobbyProps> = ({ floor = 1 }) => {
  const [doorsOpen, setDoorsOpen] = useState(false);
  const floorColour = FLOOR_COLOURS[floor - 1] ?? FLOOR_COLOURS[0];

  return (
    <div {...notContent(styles.wrapper)}>
      <div {...stylex.props(styles.scene)} data-testid="elevator-lobby-scene">
        {/* The lobby facade goes above the cab and doors: its transparent
            doorway shows them, and its walls hide the doors as they open. */}
        <img {...stylex.props(styles.cab)} src={cabUrl} alt="" />
        <div
          {...stylex.props(styles.carpet, styles.floorColour(floorColour))}
        />
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
        <svg
          {...stylex.props(styles.overlay)}
          viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <text
            x={LOBBY_X + 20}
            y={LOBBY_Y + 143}
            fill={floorColour}
            fontFamily="Arial, sans-serif"
            fontSize={102}
          >
            {floor}
          </text>
        </svg>
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
