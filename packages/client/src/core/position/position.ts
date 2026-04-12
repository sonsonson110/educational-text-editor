export class Position {
  // 0-based line and column numbers
  readonly line: number;
  readonly column: number;

  constructor(line: number, column: number) {
    this.line = line;
    this.column = column;
  }

  isBefore(other: Position): boolean {
    if (this.line < other.line) {
      return true;
    }
    if (this.line === other.line && this.column < other.column) {
      return true;
    }
    return false;
  }

  isAfter(other: Position): boolean {
    if (this.line > other.line) {
      return true;
    }
    if (this.line === other.line && this.column > other.column) {
      return true;
    }
    return false;
  }

  isEqual(other: Position): boolean {
    return this.line === other.line && this.column === other.column;
  }
}
