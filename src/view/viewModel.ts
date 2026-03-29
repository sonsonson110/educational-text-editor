import type { IEditorState } from "@/editor/editorState";
import type { ViewLine } from "./types";
import type { Command } from "@/editor/commands";

const SCROLL_X_PADDING = 3;

export interface IViewModel {
  // Viewport queries
  getViewportStart(): number;
  getLineCount(): number;
  getLineContent(line: number): string;

  // Visible content
  getVisibleLines(): ViewLine[];
  getVisibleLineCount(): number;
  setVisibleLineCount(count: number): void;

  // Horizontal viewport
  getScrollX(): number;
  getMaxLineLength(): number;
  getVisibleColumnCount(): number;
  setVisibleColumnCount(count: number): void;
  scrollLeft(cols?: number): void;
  scrollRight(cols?: number): void;

  // Cursor / selection
  isCursorVisible(): boolean;
  isSelectionCollapsed(): boolean;
  getCursorViewportPosition(): { line: number; column: number };
  getAnchorViewportPosition(): { line: number; column: number };

  // Scroll
  scrollDown(lines?: number): void;
  scrollUp(lines?: number): void;
  scrollToCursor(): void;

  // Reactive bridge
  subscribe(callback: () => void): () => void;
  execute(command: Command): void;
}

export class ViewModel implements IViewModel {
  private editor: IEditorState;
  private startLine: number;
  private visibleLineCount: number;
  private scrollX: number;
  private visibleColumnCount: number;

  constructor(
    editor: IEditorState,
    startLine: number = 0,
    visibleLineCount: number = 20,
  ) {
    this.editor = editor;
    this.startLine = startLine;
    this.visibleLineCount = visibleLineCount;
    this.scrollX = 0;
    this.visibleColumnCount = 80; // sensible default, updated by UI
  }

  getLineCount(): number {
    return this.editor.getLineCount();
  }

  getLineContent(line: number): string {
    return this.editor.getLineContent(line);
  }

  getViewportStart(): number {
    const possibleStart = this.editor.getLineCount() - this.visibleLineCount;
    const safePossibleStart = Math.max(possibleStart, 0);
    return Math.min(this.startLine, safePossibleStart);
  }

  // Does not include the end line, which is exclusive
  getViewportEnd(): number {
    return Math.min(
      this.startLine + this.visibleLineCount,
      this.editor.getLineCount(),
    );
  }

  getVisibleLineCount(): number {
    return this.visibleLineCount;
  }

  setVisibleLineCount(count: number): void {
    this.visibleLineCount = Math.max(1, count);
    // Clamp startLine so the viewport doesn't overshoot the document end
    const maxStart = Math.max(
      this.editor.getLineCount() - this.visibleLineCount,
      0,
    );
    this.startLine = Math.min(this.startLine, maxStart);
  }

  // ---------------------------------------------------------------------------
  // Horizontal viewport
  // ---------------------------------------------------------------------------

  getScrollX(): number {
    return this.scrollX;
  }

  getVisibleColumnCount(): number {
    return this.visibleColumnCount;
  }

  setVisibleColumnCount(count: number): void {
    this.visibleColumnCount = Math.max(1, count);
  }

  scrollLeft(cols: number = 1): void {
    this.scrollX = Math.max(this.scrollX - cols, 0);
  }

  scrollRight(cols: number = 1): void {
    this.scrollX = this.scrollX + cols;
    this.clampScrollX();
  }

  private clampScrollX(): void {
    const maxScrollX = Math.max(
      this.editor.getMaxLineLength() -
        this.visibleColumnCount +
        SCROLL_X_PADDING,
      0,
    );
    this.scrollX = Math.min(this.scrollX, maxScrollX);
    this.scrollX = Math.max(this.scrollX, 0);
  }

  getMaxLineLength(): number {
    return this.editor.getMaxLineLength();
  }

  // ---------------------------------------------------------------------------

  getVisibleLines(): ViewLine[] {
    // Re-clamp scrollX in case document content changed (e.g. longest line deleted)
    this.clampScrollX();

    const lines: ViewLine[] = [];
    const start = this.getViewportStart();
    const end = this.getViewportEnd();

    for (let i = start; i < end; i++) {
      lines.push({
        lineNumber: i,
        content: this.editor.getLineContent(i),
      });
    }
    return lines;
  }

  isCursorVisible(): boolean {
    const cursorPos = this.editor.getCursor().active;
    const viewportStart = this.getViewportStart();
    const viewportEnd = this.getViewportEnd();

    return cursorPos.line >= viewportStart && cursorPos.line < viewportEnd;
  }

  isSelectionCollapsed(): boolean {
    return this.editor.getCursor().isCollapsed();
  }

  getCursorViewportPosition(): { line: number; column: number } {
    const cursorPos = this.editor.getCursor().active;
    return {
      line: cursorPos.line - this.getViewportStart(),
      column: cursorPos.column,
    };
  }

  getAnchorViewportPosition(): { line: number; column: number } {
    const anchor = this.editor.getCursor().anchor;
    const vpStart = this.getViewportStart();

    return {
      line: anchor.line - vpStart,
      column: anchor.column,
    };
  }

  scrollDown(lines: number = 1): void {
    const newStart = this.editor.getLineCount() - this.visibleLineCount;
    const safeNewStart = Math.max(newStart, 0);
    this.startLine = Math.min(this.startLine + lines, safeNewStart);
  }

  scrollUp(lines: number = 1): void {
    this.startLine = Math.max(this.startLine - lines, 0);
  }

  scrollToCursor(): void {
    const cursorPos = this.editor.getCursor().active;
    const viewportStart = this.getViewportStart();
    const viewportEnd = this.getViewportEnd();

    // Vertical
    if (cursorPos.line < viewportStart) {
      this.startLine = cursorPos.line;
    } else if (cursorPos.line >= viewportEnd) {
      this.startLine = cursorPos.line - this.visibleLineCount + 1;
    }
    // No-op when cursor is already visible vertically

    // Horizontal
    if (cursorPos.column < this.scrollX) {
      this.scrollX = cursorPos.column;
    } else if (cursorPos.column >= this.scrollX + this.visibleColumnCount) {
      this.scrollX = cursorPos.column - this.visibleColumnCount + 1;
    }
    // No-op when cursor is already visible horizontally

    this.clampScrollX();
  }

  subscribe(callback: () => void): () => void {
    const unsubscribe = this.editor.subscribe(callback);
    return unsubscribe;
  }

  execute(command: Command): void {
    this.editor.execute(command);
  }
}