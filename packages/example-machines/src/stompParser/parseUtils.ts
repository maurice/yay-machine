/*
 * Parser utils to define token parsers and consume input
 */

export type Match<Value> = (
  raw: string,
  currentIndex: number,
) => false | [value: Value, currentIndex: number];

export class Matcher<Value> {
  constructor(doMatch: Match<Value>) {
    this.doMatch = doMatch;
    this.lastMatch = false;
  }

  private readonly doMatch: Match<Value>;
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
