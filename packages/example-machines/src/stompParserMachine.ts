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

  matches(raw: string, currentIndex: number): boolean {
    this.lastMatch = this.doMatch(raw, currentIndex);
    return !!this.lastMatch;
  }

  match(): Value {
    if (!Array.isArray(this.lastMatch)) {
      throw new Error("Last match was not success");
    }
    return this.lastMatch[0];
  }

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
    if (EOL.matches(raw, i)) {
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
    if (NULL.matches(raw, i)) {
      return [raw.slice(currentIndex, i), i];
    }
  }
  return false;
});

/*
 * Parser state-machine
 */

interface CommandState {
  readonly name: "parseCommand";
  readonly raw: string; // the raw unparsed data
  readonly currentIndex: number;
}

interface HeadersState extends Omit<CommandState, "name"> {
  readonly name: "parseHeaders";
  readonly command: Command;
  readonly headers: Record<string, string>;
}

interface BodyState extends Omit<CommandState, "name"> {
  readonly name: "parseBody";
  readonly command: Command;
  readonly headers: Record<string, string>;
}

interface DoneState extends Omit<BodyState, "name"> {
  readonly name: "done";
  readonly body: string;
}

interface FrameState extends Omit<BodyState, "name"> {
  readonly name: "clientCommand" | "serverCommand";
  readonly body: string;
}

interface HeartbeatState extends Omit<CommandState, "name"> {
  readonly name: "heartbeat";
}

interface ErrorState extends Omit<CommandState, "name"> {
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
  | CommandState
  | HeadersState
  | BodyState
  | DoneState
  | FrameState
  | HeartbeatState
  | ErrorState,
  never
>({
  initialState: { name: "parseCommand", raw: undefined!, currentIndex: -1 },
  states: {
    parseCommand: {
      always: [
        {
          to: "parseHeaders",
          when: ({ state: { currentIndex, raw } }) =>
            COMMAND.matches(raw, currentIndex) &&
            EOL.matches(raw, COMMAND.newIndex()),
          data: ({ state }) => ({
            ...state,
            currentIndex: EOL.newIndex(),
            command: COMMAND.match(),
            headers: {},
          }),
        },
        {
          to: "heartbeat",
          when: ({ state: { raw, currentIndex } }) =>
            EOL.matches(raw, currentIndex),
          data: ({ state }) => state,
        },
        {
          to: "error",
          data: ({ state }) => ({ ...state, errorMessage: "Command expected" }),
        },
      ],
    },
    parseHeaders: {
      always: [
        {
          to: "parseHeaders",
          when: ({ state: { currentIndex, raw } }) =>
            HEADER.matches(raw, currentIndex) &&
            EOL.matches(raw, HEADER.newIndex()),
          data: ({ state }) => ({
            ...state,
            currentIndex: EOL.newIndex(),
            headers: { ...state.headers, ...HEADER.match() },
          }),
        },
        {
          to: "parseBody",
          when: ({ state: { raw, currentIndex } }) =>
            EOL.matches(raw, currentIndex),
          data: ({ state }) => ({ ...state, currentIndex: EOL.newIndex() }),
        },
        {
          to: "error",
          data: ({ state }) => ({ ...state, errorMessage: "Invalid headers" }),
        },
      ],
    },
    parseBody: {
      always: {
        to: "done",
        when: ({ state: { raw, currentIndex } }) =>
          BODY.matches(raw, currentIndex),
        data: ({ state }) => ({ ...state, body: BODY.match() }),
      },
    },
    done: {
      always: [
        {
          to: "clientCommand",
          when: ({ state: { command } }) =>
            CLIENT_COMMANDS.includes(
              command as (typeof CLIENT_COMMANDS)[number],
            ),
          data: ({ state }) => state,
        },
        {
          to: "serverCommand",
          when: ({ state: { command } }) =>
            SERVER_COMMANDS.includes(
              command as (typeof SERVER_COMMANDS)[number],
            ),
          data: ({ state }) => state,
        },
      ],
    },
  },
});
