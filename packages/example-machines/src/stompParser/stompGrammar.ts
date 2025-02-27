import { Matcher } from "./parseUtils";

/*
 * STOMP message grammar parsers
 */

export const NULL = new Matcher<null>((raw, currentIndex) =>
  raw.charCodeAt(currentIndex) === 0 ? [null, currentIndex + 1] : false,
);

export const EOL = new Matcher((raw, currentIndex) => {
  if (raw[currentIndex] === "\n") {
    return ["\n", currentIndex + 1];
  }
  if (raw[currentIndex] === "\r" && raw[currentIndex + 1] === "\n") {
    return ["\r\n", currentIndex + 1];
  }
  return false;
});

export const CLIENT_COMMANDS = [
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

export const SERVER_COMMANDS = [
  "CONNECTED",
  "MESSAGE",
  "RECEIPT",
  "ERROR",
] as const;

export const ALL_COMMANDS = [...CLIENT_COMMANDS, ...SERVER_COMMANDS] as const;

export const COMMAND = new Matcher((raw, currentIndex) => {
  const command = ALL_COMMANDS.find((it) => raw.startsWith(it));
  if (!command) {
    return false;
  }
  return [command, currentIndex + command.length];
});

export type Command = (typeof ALL_COMMANDS)[number];

export const HEADER = new Matcher<Record<string, string>>(
  (raw, currentIndex) => {
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
  },
);

export const BODY = new Matcher<string>((raw, currentIndex) => {
  for (let i = currentIndex; i < raw.length; i++) {
    if (NULL.at(raw, i)) {
      return [raw.slice(currentIndex, i), i];
    }
  }
  return false;
});
