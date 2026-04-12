import { Position } from "./position";

export class Range {
  readonly start: Position;
  readonly end: Position;

  constructor(start: Position, end: Position) {
    if (end.isBefore(start)) {
      this.start = end;
      this.end = start;
    } else {
      this.start = start;
      this.end = end;
    }
  }

  isEmpty(): boolean {
    return this.start.isEqual(this.end);
  }

  contains(pos: Position): boolean {
    return !pos.isBefore(this.start) && !pos.isAfter(this.end);
  }
}
