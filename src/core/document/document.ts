import type { Change } from "@/core/document/change";
import { LineIndex } from "@/core/lines/lineIndex";

export class Document {
  private text: string;
  private lineIndex: LineIndex;

  constructor(initialText: string = "") {
    this.text = initialText;
    this.lineIndex = new LineIndex(initialText);
  }

  getText(): string {
    return this.text;
  }

  getLineCount(): number {
    return this.lineIndex.getLineCount();
  }

  applyChange(change: Change): void {
    const startOffset = this.offsetFromPosition(change.range.start);
    const endOffset = this.offsetFromPosition(change.range.end);

    this.text =
      this.text.slice(0, startOffset) +
      change.insertedText +
      this.text.slice(endOffset);

    this.lineIndex.rebuild(this.text);
  }

  private offsetFromPosition(pos: { line: number; column: number }): number {
    const lineStart = this.lineIndex.getLineStart(pos.line);
    return lineStart + pos.column;
  }
}
