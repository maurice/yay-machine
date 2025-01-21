import { defineMachine } from "yay-machine";

/*
 * Parser utils to define token parsers and consume input
 */

type Match<Value> = (
  raw: string,
  currentIndex: number,
) => false | [value: Value, currentIndex: number];

class Matcher<Value> {
  constructor(readonly doMatch: Match<Value>) {
    this.lastMatch = false;
  }

  private lastMatch: ReturnType<Match<Value>>;

  /**
   * @returns true if the matcher matches once at the current position
   */
  at(raw: string, currentIndex: number): boolean {
    this.lastMatch = this.doMatch(raw, currentIndex);
    return !!this.lastMatch;
  }

  /**
   * @returns true if the matcher matches zero or more times at the current position
   */
  anyAt(raw: string, currentIndex: number): boolean {
    let index = currentIndex;
    let lastMatch: ReturnType<Match<Value>>;
    do {
      lastMatch = this.doMatch(raw, index);
      if (lastMatch) {
        index = lastMatch[1];
        this.lastMatch = lastMatch;
      } else {
        this.lastMatch = [undefined!, index];
        break;
      }
    } while (lastMatch);

    return true;
  }

  /**
   * @returns the last matched value
   */
  match(): Value {
    if (!Array.isArray(this.lastMatch)) {
      throw new Error("Last match was not success");
    }
    return this.lastMatch[0];
  }

  /**
   * @returns the new index after the last matched value
   */
  newIndex(): number {
    if (!Array.isArray(this.lastMatch)) {
      throw new Error("Last match was not success");
    }
    return this.lastMatch[1];
  }
}

/*
 * STOMP message grammar parsers
 */

const NULL = new Matcher<null>((raw, currentIndex) =>
  raw.charCodeAt(currentIndex) === 0 ? [null, currentIndex + 1] : false,
);

const EOL = new Matcher((raw, currentIndex) => {
  if (raw[currentIndex] === "\n") {
    return ["\n", currentIndex + 1];
  }
  if (raw[currentIndex] === "\r" && raw[currentIndex + 1] === "\n") {
    return ["\r\n", currentIndex + 1];
  }
  return false;
});

const CLIENT_COMMANDS = [
  "SEND",
  "SUBSCRIBE",
  "UNSUBSCRIBE",
  "BEGIN",
  "COMMIT",
  "ABORT",
  "ACK",
  "NACK",
  "DISCONNECT",
  "CONNECT",
  "STOMP",
] as const;

const SERVER_COMMANDS = ["CONNECTED", "MESSAGE", "RECEIPT", "ERROR"] as const;

const ALL_COMMANDS = [...CLIENT_COMMANDS, ...SERVER_COMMANDS] as const;

const COMMAND = new Matcher((raw, currentIndex) => {
  const command = ALL_COMMANDS.find((it) => raw.indexOf(it) === 0);
  if (!command) {
    return false;
  }
  return [command, currentIndex + command.length];
});

type Command = (typeof ALL_COMMANDS)[number];

const HEADER = new Matcher<Record<string, string>>((raw, currentIndex) => {
  let headerName: string | undefined;
  let headerValue: string | undefined;
  let colon = -1;
  let end = -1;
  for (let i = currentIndex; i < raw.length; i++) {
    if (EOL.at(raw, i)) {
      end = i;
      break;
    }
    if (raw[i] === ":") {
      if (colon !== -1) {
        return false;
      }
      colon = i;
    }
  }
  if (colon > currentIndex && end > colon) {
    headerName = raw.slice(currentIndex, colon);
    headerValue = raw.slice(colon + 1, end);
    return [{ [headerName]: headerValue }, end];
  }
  return false;
});

const BODY = new Matcher<string>((raw, currentIndex) => {
  for (let i = currentIndex; i < raw.length; i++) {
    if (NULL.at(raw, i)) {
      return [raw.slice(currentIndex, i), i];
    }
  }
  return false;
});

/*
 * Parser state-machine
 */

interface InitialState {
  readonly raw: string; // the raw unparsed data
  readonly currentIndex: number;
}

interface ParseStartState extends InitialState {
  readonly name: "parse:start";
  readonly raw: string; // the raw unparsed data
  readonly currentIndex: number;
}

interface ParseCommandState extends InitialState {
  readonly name: "parse:command";
  readonly raw: string; // the raw unparsed data
  readonly currentIndex: number;
}

interface ParseHeadersState extends InitialState {
  readonly name: "parse:headers";
  readonly command: Command;
  readonly headers: Record<string, string>;
}

interface ParseBodyState extends InitialState {
  readonly name: "parse:body";
  readonly command: Command;
  readonly headers: Record<string, string>;
}

interface FrameState extends Omit<ParseBodyState, "name"> {
  readonly name: "frame?" | "command:client" | "command:server";
  readonly body: string;
}

interface HeartbeatState extends InitialState {
  readonly name: "heartbeat";
}

interface ErrorState extends InitialState {
  readonly name: "error";
  readonly errorMessage: string;
}

/**
 * A parser for STOMP 1.2 frames.
 * 
 * An example message from their docs looks like
 * 
```
MESSAGE
subscription:0
message-id:007
destination:/queue/a
content-type:text/plain

hello queue a^@
```
 * 
 * @see https://stomp.github.io/stomp-specification-1.2.html
 * @see https://stomp.github.io/stomp-specification-1.2.html#Augmented_BNF
 */
export const stompParserMachine = defineMachine<
  | ParseStartState
  | ParseCommandState
  | ParseHeadersState
  | ParseBodyState
  | FrameState
  | HeartbeatState
  | ErrorState,
  never
>({
  initialState: { name: "parse:start", raw: undefined!, currentIndex: -1 },
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
});
