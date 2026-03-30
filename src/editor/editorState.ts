import type { IDocument } from "@/core/document/document";
import { Position } from "@/core/position/position";
import type { Command } from "@/editor/commands";
import { Cursor } from "@/editor/cursor/cursor";
import { Range } from "@/core/position/range";
import { HistoryManager } from "@/editor/history";

export interface IEditorState {
  getCursor(): Cursor;
  getLineCount(): number;
  getLineContent(line: number): string;
  getMaxLineLength(): number;
  execute(command: Command): void;
  subscribe(listener: () => void): () => void;
}

export class EditorState implements IEditorState {
  private document: IDocument;
  private cursor: Cursor;
  private listeners = new Set<() => void>();
  private history: HistoryManager;

  constructor(doc: IDocument, cursor: Cursor) {
    this.document = doc;
    this.cursor = cursor;
    this.history = new HistoryManager();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener());
  }

  private setCursor(cursor: Cursor): void {
    this.cursor = cursor;
  }

  getCursor(): Cursor {
    return this.cursor;
  }

  private insert(text: string): void {
    const range = this.cursor.toRange();
    const cursorBefore = this.cursor;
    const undoText = this.document.getTextInRange(range);

    this.document.replace(range, text);

    const startOffset = this.document.getOffsetAt(range.start);
    const newOffset = startOffset + text.length;
    const newPosition = this.document.getPositionAt(newOffset);
    this.cursor = this.cursor.moveTo(newPosition);

    const undoRange = new Range(range.start, newPosition);
    this.history.push({
      doText: text,
      doRange: range,
      undoText,
      undoRange,
      cursorBefore,
      cursorAfter: this.cursor,
      isCharacterInsert: text.length === 1 && !["\n", " "].includes(text),
    });
  }

  private deleteBackward(): void {
    const range = this.cursor.toRange();
    const cursorBefore = this.cursor;

    if (!range.isEmpty()) {
      const undoText = this.document.getTextInRange(range);
      this.document.delete(range);
      this.cursor = this.cursor.moveTo(range.start);
      this.history.push({
        doText: "",
        doRange: range,
        undoText,
        undoRange: new Range(range.start, range.start),
        cursorBefore,
        cursorAfter: this.cursor,
        isCharacterInsert: false,
      });
      return;
    }
    const currentCursor = this.cursor;
    if (currentCursor.isAtStart()) {
      return;
    }

    const prevOffset = this.document.getOffsetAt(currentCursor.active) - 1;
    const prevPosition = this.document.getPositionAt(prevOffset);
    const deleteRange = new Range(prevPosition, currentCursor.active);
    const undoText = this.document.getTextInRange(deleteRange);

    this.document.delete(deleteRange);
    this.cursor = this.cursor.moveTo(prevPosition);

    this.history.push({
      doText: "",
      doRange: deleteRange,
      undoText,
      undoRange: new Range(prevPosition, prevPosition),
      cursorBefore,
      cursorAfter: this.cursor,
      isCharacterInsert: false,
    });
  }

  private deleteForward(): void {
    const range = this.cursor.toRange();
    const cursorBefore = this.cursor;

    if (!range.isEmpty()) {
      const undoText = this.document.getTextInRange(range);
      this.document.delete(range);
      this.cursor = this.cursor.moveTo(range.start);
      this.history.push({
        doText: "",
        doRange: range,
        undoText,
        undoRange: new Range(range.start, range.start),
        cursorBefore,
        cursorAfter: this.cursor,
        isCharacterInsert: false,
      });
      return;
    }
    const currentCursor = this.cursor;
    const documentLength = this.document.getLength();
    if (this.document.getOffsetAt(currentCursor.active) >= documentLength) {
      return;
    }

    const nextOffset = this.document.getOffsetAt(currentCursor.active) + 1;
    const nextPosition = this.document.getPositionAt(nextOffset);
    const deleteRange = new Range(currentCursor.active, nextPosition);
    const undoText = this.document.getTextInRange(deleteRange);

    this.document.delete(deleteRange);
    this.cursor = this.cursor.moveTo(currentCursor.active);

    this.history.push({
      doText: "",
      doRange: deleteRange,
      undoText,
      undoRange: new Range(currentCursor.active, currentCursor.active),
      cursorBefore,
      cursorAfter: this.cursor,
      isCharacterInsert: false,
    });
  }

  moveCursor(direction: "left" | "right" | "up" | "down"): void {
    const cursor = this.cursor;

    // collapse selection if exists
    if (!cursor.isCollapsed()) {
      this.cursor =
        direction === "left"
          ? cursor.collapseToStart()
          : cursor.collapseToEnd();
      return;
    }

    const current = cursor.active;
    const offset = this.document.getOffsetAt(current);

    switch (direction) {
      case "left":
        if (offset > 0) {
          const newPos = this.document.getPositionAt(offset - 1);
          this.cursor = cursor.moveTo(newPos);
        }
        break;

      case "right":
        if (offset < this.document.getLength()) {
          const newPos = this.document.getPositionAt(offset + 1);
          this.cursor = cursor.moveTo(newPos);
        }
        break;

      case "up": {
        const currentLine = current.line;
        if (currentLine > 0) {
          const nextLineLength = this.document.getLineLength(currentLine - 1);
          const newPos = new Position(
            currentLine - 1,
            Math.min(current.column, nextLineLength),
          );
          this.cursor = cursor.moveTo(newPos);
        }
        break;
      }

      case "down": {
        const currentLine = current.line;
        if (currentLine < this.document.getLineCount() - 1) {
          const nextLineLength = this.document.getLineLength(currentLine + 1);
          const newPos = new Position(
            currentLine + 1,
            Math.min(current.column, nextLineLength),
          );
          this.cursor = cursor.moveTo(newPos);
        }
        break;
      }
    }
  }

  private expandSelection(position: Position): void {
    this.cursor = this.cursor.setActive(position);
  }

  getLineCount(): number {
    return this.document.getLineCount();
  }

  getLineContent(line: number): string {
    return this.document.getLineContent(line);
  }

  getMaxLineLength(): number {
    return this.document.getMaxLineLength();
  }

  private undo(): void {
    const op = this.history.undo();
    if (op) {
      this.document.replace(op.undoRange, op.undoText);
      this.cursor = op.cursorBefore;
    }
  }

  private redo(): void {
    const op = this.history.redo();
    if (op) {
      this.document.replace(op.doRange, op.doText);
      this.cursor = op.cursorAfter;
    }
  }

  execute(command: Command): void {
    switch (command.type) {
      case "insert_text":
        this.insert(command.text);
        break;

      case "delete_backward":
        this.deleteBackward();
        break;

      case "delete_forward":
        this.deleteForward();
        break;

      case "move_cursor":
        this.moveCursor(command.direction);
        break;

      case "move_cursor_to":
        this.setCursor(new Cursor(command.position));
        break;

      case "select_to":
        this.expandSelection(command.position);
        break;

      case "undo":
        this.undo();
        break;

      case "redo":
        this.redo();
        break;
    }
    this.notifyListeners();
  }
}
