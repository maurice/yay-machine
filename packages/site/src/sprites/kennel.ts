/**
 * A kennel keeps all the dog sheets in one file, scrambled so it isn't an image
 * anyone can open or save. The pack's licence lets us use the sheets, but not
 * hand them out. This isn't encryption, as the key is right here, but it keeps
 * them from being one click away.
 *
 * It's "WOOF", a version byte, then scrambled: the index's length (4 bytes,
 * little-endian), the index as JSON (`[file, byteLength][]`), and every sheet's
 * PNG one after another. Pages only read kennels; `packages/sprite-prep`
 * writes them.
 */
export type KennelSheets = ReadonlyMap<string, Uint8Array<ArrayBuffer>>;

export const magic = "WOOF";
export const version = 1;
/** The magic and version byte. */
export const header = magic.length + 1;
const key = 0xd06b15c7;

/** XORs with a keyed stream of noise (mulberry32), so doing it twice undoes it. */
export const scramble = (bytes: Uint8Array) => {
  let state = key;
  return Uint8Array.from(bytes, (byte) => {
    state = (state + 0x6d2b79f5) | 0;
    let noise = Math.imul(state ^ (state >>> 15), state | 1);
    noise ^= noise + Math.imul(noise ^ (noise >>> 7), noise | 61);
    return byte ^ ((noise ^ (noise >>> 14)) >>> 24);
  });
};

const isIndex = (index: unknown): index is readonly [string, number][] =>
  Array.isArray(index) &&
  index.every(
    (entry) =>
      Array.isArray(entry) &&
      typeof entry[0] === "string" &&
      Number.isInteger(entry[1]) &&
      entry[1] >= 0,
  );

const damaged = () => new Error("The kennel is damaged");

/** Lets the sheets out of a kennel, keyed by file name. */
export const readKennel = (kennel: Uint8Array): KennelSheets => {
  if (new TextDecoder().decode(kennel.subarray(0, magic.length)) !== magic) {
    throw new Error("That's not a kennel");
  }
  if (kennel[magic.length] !== version) {
    throw new Error(`Expected a version ${version} kennel`);
  }

  const body = scramble(kennel.subarray(header));
  if (body.length < 4) throw damaged();
  const indexEnd = 4 + new DataView(body.buffer).getUint32(0, true);
  let index: unknown;
  try {
    index = JSON.parse(new TextDecoder().decode(body.subarray(4, indexEnd)));
  } catch {
    throw damaged();
  }
  if (!isIndex(index)) throw damaged();

  let offset = indexEnd;
  const sheets = new Map(
    index.map(([file, length]) => {
      const bytes = body.subarray(offset, offset + length);
      offset += length;
      return [file, bytes] as const;
    }),
  );
  if (offset !== body.length) throw damaged();
  return sheets;
};
