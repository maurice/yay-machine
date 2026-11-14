import * as stylex from "@stylexjs/stylex";
import {
  elevatorMachine,
  type ElevatorState,
} from "@yay-machine/example-machines";
import {
  type FC,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import cabUrl from "../../../../assets/elevator/cab.png?url&no-inline";
import callButtonLitUrl from "../../../../assets/elevator/call-button-lit.png?url&no-inline";
import callButtonUrl from "../../../../assets/elevator/call-button.png?url&no-inline";
import doorUrl from "../../../../assets/elevator/door.png?url&no-inline";
import lobbyUrl from "../../../../assets/elevator/lobby.png?url&no-inline";
import positionIndicatorUrl from "../../../../assets/elevator/position-indicator.png?url&no-inline";
import { notContent } from "../../../../components/notContent";
import { colors, textSizes } from "../../../../styles/starlight.stylex";

// The frame shows one whole lobby and half a neighbouring floor on each side.
const LOBBY_WIDTH = 619;
const LOBBY_HEIGHT = 258;
const SCENE_HEIGHT = 500;
const FLOOR_HEIGHT = (LOBBY_HEIGHT / SCENE_HEIGHT) * 100;
const CENTER_FLOOR_TOP =
  ((SCENE_HEIGHT - LOBBY_HEIGHT) / 2 / SCENE_HEIGHT) * 100;
const MIN_FLOOR = 1;
const SHAFT_LEFT = (259 / LOBBY_WIDTH) * 100;
const SHAFT_RIGHT = ((259 + 102) / LOBBY_WIDTH) * 100;
const SHAFT_OPENING = `polygon(0 0, ${SHAFT_LEFT}% 0, ${SHAFT_LEFT}% 100%, ${SHAFT_RIGHT}% 100%, ${SHAFT_RIGHT}% 0, 100% 0, 100% 100%, 0 100%)`;

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
const MAX_FLOOR = FLOOR_COLOURS.length;
const FLOOR_NUMBERS = Array.from(
  { length: MAX_FLOOR },
  (_, index) => MAX_FLOOR - index,
);

// Same as the elevator machine's doorsOpening/doorsClosing time.
const DOOR_TRAVEL_MS = 5000;
// One step per art pixel of the 51px-wide door.
const DOOR_TRAVEL_STEPS = 51;
// Only the slide is animated; the right door's mirroring must never transition.
const doorTransition = `translate ${DOOR_TRAVEL_MS}ms steps(${DOOR_TRAVEL_STEPS}, end)`;
// The building scrolls one lobby-height during each five-second trip.
const floorTransition = `translate ${DOOR_TRAVEL_MS}ms steps(${LOBBY_HEIGHT}, end)`;

const initialElevatorState = (floor: number): ElevatorState => ({
  name: "doorsClosed",
  currentFloor: floor,
  actionStarted: -1,
  floorsToVisit: [],
});

const elevatorStatus = (state: ElevatorState): string => {
  switch (state.name) {
    case "doorsClosed":
      return `At floor ${state.currentFloor}`;
    case "doorsOpening":
      return `Doors opening at floor ${state.currentFloor}`;
    case "doorsOpen":
      return `Stopped at floor ${state.currentFloor}`;
    case "doorsClosing":
      return `Doors closing at floor ${state.currentFloor}`;
    case "goingUp":
    case "goingDown": {
      const direction = state.name === "goingUp" ? "up" : "down";
      const target = state.floorsToVisit[0] ?? state.currentFloor;
      return `Going ${direction} from floor ${state.currentFloor} to floor ${target}`;
    }
    default:
      throw new Error(`Unexpected elevator state: ${state.name}`);
  }
};

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
    maxWidth: `${LOBBY_WIDTH}px`,
    aspectRatio: `${LOBBY_WIDTH} / ${SCENE_HEIGHT}`,
    overflow: "hidden",
    backgroundColor: "#222034",
    imageRendering: "pixelated",
  },
  building: {
    position: "absolute",
    inset: 0,
    zIndex: 0,
    transition: floorTransition,
  },
  lobbyFacade: {
    position: "absolute",
    inset: 0,
    zIndex: 3,
    transition: floorTransition,
  },
  floorOverlays: {
    position: "absolute",
    inset: 0,
    zIndex: 4,
    transition: floorTransition,
  },
  cameraOffset: (offset: number) => ({
    translate: `0 ${offset * FLOOR_HEIGHT}%`,
  }),
  floor: {
    position: "absolute",
    left: 0,
    width: "100%",
    height: `${FLOOR_HEIGHT}%`,
  },
  floorPosition: (offset: number) => ({
    top: `${CENTER_FLOOR_TOP - offset * FLOOR_HEIGHT}%`,
  }),
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
  shaftCut: {
    clipPath: SHAFT_OPENING,
  },
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
    top: `${CENTER_FLOOR_TOP + (83 / LOBBY_HEIGHT) * FLOOR_HEIGHT}%`,
    width: `${(102 / LOBBY_WIDTH) * 100}%`,
    height: `${(98 / SCENE_HEIGHT) * 100}%`,
    imageRendering: "pixelated",
    zIndex: 1,
  },
  landingDoors: {
    position: "absolute",
    inset: 0,
    zIndex: 2,
    transition: floorTransition,
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
  disabledButton: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  status: {
    margin: 0,
    color: colors.gray2,
    fontSize: textSizes.sm,
  },
});

interface ElevatorLobbyProps {
  readonly floor?: number;
}

export const ElevatorLobby: FC<ElevatorLobbyProps> = ({ floor = 2 }) => {
  const [callButtonLit, setCallButtonLit] = useState(false);
  const machine = useMemo(
    () =>
      elevatorMachine.newInstance({
        initialState: initialElevatorState(floor),
      }),
    [floor],
  );
  const subscribe = useCallback(
    (listener: () => void) => machine.subscribe(listener),
    [machine],
  );
  const getSnapshot = useCallback(() => machine.state, [machine]);
  const machineState = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot,
  );
  useEffect(() => {
    machine.start();
    return () => {
      machine.stop();
    };
  }, [machine]);

  const requestFloor = (direction: -1 | 1) => {
    if (machine.state.name !== "doorsClosed") return;

    const destination = machine.state.currentFloor + direction;
    if (destination < MIN_FLOOR || destination > MAX_FLOOR) return;

    machine.send({ type: "VISIT_FLOOR", floor: destination });
  };

  const isMoving =
    machineState.name === "goingUp" || machineState.name === "goingDown";
  const requestedFloor = machineState.floorsToVisit[0];
  const cameraFloor =
    isMoving && requestedFloor !== undefined
      ? requestedFloor
      : machineState.currentFloor;
  const cameraOffset = cameraFloor - floor;
  const doorsOpen =
    machineState.name === "doorsOpening" || machineState.name === "doorsOpen";
  const canTravel = machineState.name === "doorsClosed";
  const canGoUp = canTravel && machineState.currentFloor < MAX_FLOOR;
  const canGoDown = canTravel && machineState.currentFloor > MIN_FLOOR;

  return (
    <div {...notContent(styles.wrapper)}>
      <div {...stylex.props(styles.scene)} data-testid="elevator-lobby-scene">
        <div
          {...stylex.props(styles.building, styles.cameraOffset(cameraOffset))}
          data-testid="elevator-building"
        >
          {FLOOR_NUMBERS.map((floorNumber) => {
            return (
              <div
                {...stylex.props(
                  styles.floor,
                  styles.floorPosition(floorNumber - floor),
                )}
                key={floorNumber}
                data-floor={floorNumber}
              >
                <div
                  {...stylex.props(
                    styles.carpet,
                    styles.floorColour(
                      FLOOR_COLOURS[floorNumber - 1] ?? FLOOR_COLOURS[0],
                    ),
                    isMoving && styles.shaftCut,
                  )}
                />
                <img
                  {...stylex.props(styles.lobby, isMoving && styles.shaftCut)}
                  src={lobbyUrl}
                  alt=""
                />
              </div>
            );
          })}
        </div>
        <img {...stylex.props(styles.cab)} src={cabUrl} alt="" />
        <div
          {...stylex.props(
            styles.landingDoors,
            styles.cameraOffset(cameraOffset),
          )}
        >
          {FLOOR_NUMBERS.map((floorNumber) => (
            <div
              {...stylex.props(
                styles.floor,
                styles.floorPosition(floorNumber - floor),
              )}
              key={floorNumber}
              data-floor-doors={floorNumber}
            >
              <img
                {...stylex.props(
                  styles.leftDoor,
                  floorNumber === machineState.currentFloor &&
                    doorsOpen &&
                    styles.leftOpen,
                )}
                src={doorUrl}
                data-door="left"
                alt=""
              />
              <img
                {...stylex.props(
                  styles.rightDoor,
                  floorNumber === machineState.currentFloor &&
                    doorsOpen &&
                    styles.rightOpen,
                )}
                src={doorUrl}
                data-door="right"
                alt=""
              />
            </div>
          ))}
        </div>
        <div
          {...stylex.props(
            styles.lobbyFacade,
            styles.cameraOffset(cameraOffset),
          )}
        >
          {FLOOR_NUMBERS.map((floorNumber) => (
            <div
              {...stylex.props(
                styles.floor,
                styles.floorPosition(floorNumber - floor),
              )}
              key={floorNumber}
            >
              <img
                {...stylex.props(styles.lobby, isMoving && styles.shaftCut)}
                src={lobbyUrl}
                alt=""
              />
            </div>
          ))}
        </div>
        <div
          {...stylex.props(
            styles.floorOverlays,
            styles.cameraOffset(cameraOffset),
          )}
        >
          {FLOOR_NUMBERS.map((floorNumber) => {
            const floorColour =
              FLOOR_COLOURS[floorNumber - 1] ?? FLOOR_COLOURS[0];

            return (
              <svg
                {...stylex.props(
                  styles.floor,
                  styles.floorPosition(floorNumber - floor),
                  styles.overlay,
                )}
                key={floorNumber}
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
                  {floorNumber}
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
                {floorNumber === machineState.currentFloor && (
                  <image
                    href={callButtonLitUrl}
                    x={CALL_BUTTON.x}
                    y={CALL_BUTTON.y}
                    width={CALL_BUTTON.width}
                    height={CALL_BUTTON.height}
                    visibility={callButtonLit ? "visible" : "hidden"}
                  />
                )}
              </svg>
            );
          })}
        </div>
      </div>
      <div {...stylex.props(styles.controls)}>
        <button
          {...stylex.props(styles.button, !canGoUp && styles.disabledButton)}
          type="button"
          disabled={!canGoUp}
          onClick={() => requestFloor(1)}
        >
          Up one floor
        </button>
        <button
          {...stylex.props(styles.button, !canGoDown && styles.disabledButton)}
          type="button"
          disabled={!canGoDown}
          onClick={() => requestFloor(-1)}
        >
          Down one floor
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
      <p {...stylex.props(styles.status)} role="status" aria-live="polite">
        {elevatorStatus(machineState)}
      </p>
    </div>
  );
};
