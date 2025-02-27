import { defineMachine } from "yay-machine";
import {
  BODY,
  CLIENT_COMMANDS,
  COMMAND,
  type Command,
  EOL,
  HEADER,
  NULL,
  SERVER_COMMANDS,
} from "./stompGrammar";

/*
 * Parser state-machine
 */

interface IdleState {
  readonly name: "idle";
}

interface ParseState {
  readonly raw: string; // the raw unparsed data
  readonly currentIndex: number;
}

interface ParseStartState extends ParseState {
  readonly name: "parse:start";
  readonly raw: string; // the raw unparsed data
  readonly currentIndex: number;
}

interface ParseCommandState extends ParseState {
  readonly name: "parse:command";
  readonly raw: string; // the raw unparsed data
  readonly currentIndex: number;
}

interface ParseHeadersState extends ParseState {
  readonly name: "parse:headers";
  readonly command: Command;
  readonly headers: Record<string, string>;
}

interface ParseBodyState extends ParseState {
  readonly name: "parse:body";
  readonly command: Command;
  readonly headers: Record<string, string>;
}

interface FrameState extends Omit<ParseBodyState, "name"> {
  readonly name: "frame?" | "command:client" | "command:server";
  readonly body: string;
}

interface HeartbeatState extends ParseState {
  readonly name: "heartbeat";
}

interface ErrorState extends ParseState {
  readonly name: "error";
  readonly errorMessage: string;
}

type ParserState =
  | IdleState
  | ParseStartState
  | ParseCommandState
  | ParseHeadersState
  | ParseBodyState
  | FrameState
  | HeartbeatState
  | ErrorState;

interface ParserEvent {
  readonly type: "PARSE";
  readonly raw: string;
}

/**
 * A parser for STOMP 1.2 frames.
 *
 * An example message from their docs looks like
 *
 * "MESSAGE
 * subscription:0
 * message-id:007
 * destination:/queue/a
 * content-type:text/plain
 *
 * hello queue a^@"
 *
 * @see https://stomp.github.io/stomp-specification-1.2.html
 * @see https://stomp.github.io/stomp-specification-1.2.html#Augmented_BNF
 */
export const stompParserMachine = defineMachine<ParserState, ParserEvent>({
  initialState: { name: "idle" },
  states: {
    "parse:start": {
      always: [
        {
          to: "heartbeat",
          when: ({ state: { raw, currentIndex } }) => EOL.at(raw, currentIndex),
          data: ({ state }) => state,
        },
        {
          to: "parse:command",
          data: ({ state }) => state,
        },
      ],
    },
    "parse:command": {
      always: [
        {
          to: "parse:headers",
          when: ({ state: { currentIndex, raw } }) =>
            COMMAND.at(raw, currentIndex) && EOL.at(raw, COMMAND.newIndex()),
          data: ({ state }) => ({
            ...state,
            currentIndex: EOL.newIndex(),
            command: COMMAND.match(),
            headers: {},
          }),
        },
        {
          to: "heartbeat",
          when: ({ state: { raw, currentIndex } }) => EOL.at(raw, currentIndex),
          data: ({ state }) => state,
        },
        {
          to: "error",
          data: ({ state }) => ({
            ...state,
            errorMessage: `Command expected, found: "${state.raw.slice(0, 15)}..."`,
          }),
        },
      ],
    },
    "parse:headers": {
      always: [
        {
          to: "parse:headers",
          when: ({ state: { currentIndex, raw } }) =>
            HEADER.at(raw, currentIndex) && EOL.at(raw, HEADER.newIndex()),
          data: ({ state }) => ({
            ...state,
            currentIndex: EOL.newIndex(),
            headers: { ...state.headers, ...HEADER.match() },
          }),
        },
        {
          to: "parse:body",
          when: ({ state: { raw, currentIndex } }) => EOL.at(raw, currentIndex),
          data: ({ state }) => ({ ...state, currentIndex: EOL.newIndex() }),
        },
        {
          to: "error",
          data: ({ state: { raw, currentIndex } }) => ({
            raw,
            currentIndex,
            errorMessage: `Invalid headers, at: "${raw.slice(currentIndex, currentIndex + 15)}..."`,
          }),
        },
      ],
    },
    "parse:body": {
      always: [
        {
          to: "frame?",
          when: ({ state: { raw, currentIndex } }) =>
            BODY.at(raw, currentIndex) &&
            NULL.at(raw, BODY.newIndex()) &&
            EOL.anyAt(raw, NULL.newIndex()),
          data: ({ state }) => ({
            ...state,
            body: BODY.match(),
            currentIndex: EOL.newIndex(),
          }),
        },
        {
          to: "error",
          data: ({ state: { raw, currentIndex } }) => ({
            raw,
            currentIndex,
            errorMessage: `Invalid body/missing null, at: "${raw.slice(currentIndex, 15)}..."`,
          }),
        },
      ],
    },
    "frame?": {
      always: [
        {
          to: "command:client",
          when: ({ state: { command } }) =>
            CLIENT_COMMANDS.includes(
              command as (typeof CLIENT_COMMANDS)[number],
            ),
          data: ({ state }) => state,
        },
        {
          to: "command:server",
          when: ({ state: { command } }) =>
            SERVER_COMMANDS.includes(
              command as (typeof SERVER_COMMANDS)[number],
            ),
          data: ({ state }) => state,
        },
      ],
    },
    "command:client": {
      always: {
        to: "parse:start",
        when: ({ state: { raw, currentIndex } }) =>
          COMMAND.at(raw, currentIndex) && EOL.at(raw, COMMAND.newIndex()),
        data: ({ state }) => state,
      },
    },
    "command:server": {
      always: {
        to: "parse:start",
        when: ({ state: { raw, currentIndex } }) =>
          COMMAND.at(raw, currentIndex) && EOL.at(raw, COMMAND.newIndex()),
        data: ({ state }) => state,
      },
    },
  },
  on: {
    PARSE: {
      to: "parse:start",
      data: ({ event: { raw } }) => ({ raw, currentIndex: 0 }),
    },
  },
});
