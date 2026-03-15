export class LineIndex {
  // lineStarts[i] is the index of the first character of line i+1 in the document text
  // lineStarts[0] = offset of first line
  // lineStarts[1] = offset of second line
  private lineStarts: number[] = [];

  constructor(text: string) {
    this.rebuild(text);
  }

  rebuild(text: string): void {
    this.lineStarts = [0];
    for (let i = 0; i < text.length; i++) {
      if (text[i] === "\n") {
        this.lineStarts.push(i + 1);
      }
    }
  }

  getLineCount(): number {
    return this.lineStarts.length;
  }

  getLineStart(line: number): number {
    if (line < 0 || line >= this.lineStarts.length) {
      throw new Error("Line number out of range");
    }
    return this.lineStarts[line];
  }
}
