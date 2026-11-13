import {
  header,
  type KennelSheets,
  magic,
  scramble,
  version,
} from "@yay-machine/site/sprites/kennel";

/** Puts the sheets in a kennel, in the order given, for the site to read. */
export const writeKennel = (sheets: KennelSheets) => {
  const index = new TextEncoder().encode(
    JSON.stringify([...sheets].map(([file, bytes]) => [file, bytes.length])),
  );
  const body = new Uint8Array(
    4 + index.length + [...sheets.values()].reduce((n, b) => n + b.length, 0),
  );
  new DataView(body.buffer).setUint32(0, index.length, true);
  body.set(index, 4);
  let offset = 4 + index.length;
  for (const bytes of sheets.values()) {
    body.set(bytes, offset);
    offset += bytes.length;
  }

  const kennel = new Uint8Array(header + body.length);
  kennel.set(new TextEncoder().encode(magic));
  kennel[magic.length] = version;
  kennel.set(scramble(body), header);
  return kennel;
};
