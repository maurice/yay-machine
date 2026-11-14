import * as stylex from "@stylexjs/stylex";
import { type FC, useState } from "react";
import cabUrl from "../../../../assets/elevator/cab.png?url&no-inline";
import callButtonLitUrl from "../../../../assets/elevator/call-button-lit.png?url&no-inline";
import callButtonUrl from "../../../../assets/elevator/call-button.png?url&no-inline";
import doorUrl from "../../../../assets/elevator/door.png?url&no-inline";
import lobbyUrl from "../../../../assets/elevator/lobby.png?url&no-inline";
import positionIndicatorUrl from "../../../../assets/elevator/position-indicator.png?url&no-inline";
import { notContent } from "../../../../components/notContent";
import { colors, textSizes } from "../../../../styles/starlight.stylex";

// Frame this single-floor preview to the artwork, not the scrolling camera.
const LOBBY_WIDTH = 619;
const LOBBY_HEIGHT = 258;

// Wall controls, in lobby.png pixels. They come from the Aseprite mock-up,
// where the lift sat 58px further left, so they move right by the same amount.
const CALL_BUTTON = { x: 228, y: 111, width: 13, height: 10 };
const POSITION_INDICATOR = { x: 302, y: 35, width: 17, height: 10 };

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
    aspectRatio: `${LOBBY_WIDTH} / ${LOBBY_HEIGHT}`,
    overflow: "hidden",
    backgroundColor: "#222034",
    imageRendering: "pixelated",
  },
  carpet: {
    position: "absolute",
    left: 0,
    top: `${(181 / LOBBY_HEIGHT) * 100}%`,
    width: "100%",
    height: `${(59 / LOBBY_HEIGHT) * 100}%`,
  },
  floorColour: (colour: string) => ({
    backgroundColor: colour,
  }),
  lobby: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    imageRendering: "pixelated",
  },
  cab: {
    position: "absolute",
    left: `${(259 / LOBBY_WIDTH) * 100}%`,
    top: `${(83 / LOBBY_HEIGHT) * 100}%`,
    width: `${(102 / LOBBY_WIDTH) * 100}%`,
    height: `${(98 / LOBBY_HEIGHT) * 100}%`,
    imageRendering: "pixelated",
  },
  leftDoor: {
    position: "absolute",
    left: `${(259 / LOBBY_WIDTH) * 100}%`,
    top: `${(84 / LOBBY_HEIGHT) * 100}%`,
    width: `${(51 / LOBBY_WIDTH) * 100}%`,
    height: `${(96 / LOBBY_HEIGHT) * 100}%`,
    imageRendering: "pixelated",
    transition: doorTransition,
  },
  rightDoor: {
    position: "absolute",
    left: `${(310 / LOBBY_WIDTH) * 100}%`,
    top: `${(84 / LOBBY_HEIGHT) * 100}%`,
    width: `${(51 / LOBBY_WIDTH) * 100}%`,
    height: `${(96 / LOBBY_HEIGHT) * 100}%`,
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
  controls: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: "0.5rem",
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
  const [callButtonLit, setCallButtonLit] = useState(false);
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
          viewBox={`0 0 ${LOBBY_WIDTH} ${LOBBY_HEIGHT}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <text
            x={20}
            y={143}
            fill={floorColour}
            fontFamily="Arial, sans-serif"
            fontSize={102}
          >
            {floor}
          </text>
          <image
            href={positionIndicatorUrl}
            x={POSITION_INDICATOR.x}
            y={POSITION_INDICATOR.y}
            width={POSITION_INDICATOR.width}
            height={POSITION_INDICATOR.height}
          />
          <image
            href={callButtonUrl}
            x={CALL_BUTTON.x}
            y={CALL_BUTTON.y}
            width={CALL_BUTTON.width}
            height={CALL_BUTTON.height}
          />
          <image
            href={callButtonLitUrl}
            x={CALL_BUTTON.x}
            y={CALL_BUTTON.y}
            width={CALL_BUTTON.width}
            height={CALL_BUTTON.height}
            visibility={callButtonLit ? "visible" : "hidden"}
          />
        </svg>
      </div>
      <div {...stylex.props(styles.controls)}>
        <button
          {...stylex.props(styles.button)}
          type="button"
          aria-pressed={doorsOpen}
          onClick={() => setDoorsOpen((open) => !open)}
        >
          {doorsOpen ? "Close doors" : "Open doors"}
        </button>
        <button
          {...stylex.props(styles.button)}
          type="button"
          aria-pressed={callButtonLit}
          onClick={() => setCallButtonLit((lit) => !lit)}
        >
          {callButtonLit ? "Reset call button" : "Press call button"}
        </button>
      </div>
    </div>
  );
};
