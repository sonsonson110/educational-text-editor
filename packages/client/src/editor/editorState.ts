import type { IDocument } from "@/core/document/idocument";
import { Position } from "@/core/position/position";
import { getWordLeftOffset, getWordRightOffset } from "@/core/utils";
import type { Command, CursorDirection } from "@/editor/commands";
import { Cursor } from "@/editor/cursor/cursor";
import { Range } from "@/core/position/range";
import { HistoryManager, type IUndoRedoManager } from "@/editor/history";
import * as Y from "yjs";

export interface IEditorState {
  getCursor(): Cursor;
  getLineCount(): number;
  getLineContent(line: number): string;
  getMaxLineLength(): number;
  getSelectedText(): string;
  execute(command: Command): void;
  subscribe(listener: () => void): () => void;
}

export class EditorState implements IEditorState {
  private document: IDocument;
  private cursor: Cursor;
  private listeners = new Set<() => void>();
  private history: IUndoRedoManager;
  private ydoc?: Y.Doc;
  private ytext?: Y.Text;
  private relativeAnchor: Y.RelativePosition | null = null;
  private relativeHead: Y.RelativePosition | null = null;

  constructor(
    doc: IDocument, 
    cursor: Cursor, 
    history?: IUndoRedoManager,
    ydoc?: Y.Doc,
    ytext?: Y.Text
  ) {
    this.document = doc;
    this.cursor = cursor;
    this.history = history ?? new HistoryManager();
    this.ydoc = ydoc;
    this.ytext = ytext;

    // If the document supports remote-change notifications (i.e. it is a
    // CollaborativeDocument), forward those notifications through our own
    // listener pipeline so the UI re-renders on remote edits.
    if (doc.subscribe) {
      doc.subscribe(() => {
        this.restoreCursorFromRelative();
        this.notifyListeners();
      });
    }
  }

  /**
   * Snapshot the current cursor as Yjs relative positions.
   *
   * Called after every local command so that, when a remote edit arrives,
   * we can resolve these positions back to absolute indexes and keep the
   * cursor in the "same" logical place.
   */
  private updateRelativeCursor(): void {
    if (!this.ytext) return;
    const anchorOffset = this.document.getOffsetAt(this.cursor.anchor);
    const headOffset = this.document.getOffsetAt(this.cursor.active);
    this.relativeAnchor = Y.createRelativePositionFromTypeIndex(this.ytext, anchorOffset);
    this.relativeHead = Y.createRelativePositionFromTypeIndex(this.ytext, headOffset);
  }

  /**
   * Resolve the stored relative positions back to absolute after a remote edit.
   *
   * This prevents the local cursor from jumping when another user inserts or
   * deletes text before the cursor position.
   */
  private restoreCursorFromRelative(): void {
    if (this.ydoc && this.relativeAnchor && this.relativeHead) {
      const newAnchorAbs = Y.createAbsolutePositionFromRelativePosition(this.relativeAnchor, this.ydoc);
      const newHeadAbs = Y.createAbsolutePositionFromRelativePosition(this.relativeHead, this.ydoc);
      
      if (newAnchorAbs && newHeadAbs) {
        const newAnchorPos = this.document.getPositionAt(newAnchorAbs.index);
        const newHeadPos = this.document.getPositionAt(newHeadAbs.index);
        this.cursor = new Cursor(newAnchorPos, newHeadPos);
      }
    }
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

  getSelectedText(): string {
    const range = this.cursor.toRange();
    if (range.isEmpty()) return "";
    return this.document.getTextInRange(range);
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

  private deleteBackward(granularity: "char" | "word" = "char"): void {
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

    const currentOffset = this.document.getOffsetAt(currentCursor.active);
    const prevOffset =
      granularity === "word"
        ? getWordLeftOffset(this.document.getText(), currentOffset)
        : currentOffset - 1;

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

  private deleteForward(granularity: "char" | "word" = "char"): void {
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
    const currentOffset = this.document.getOffsetAt(currentCursor.active);
    if (currentOffset >= documentLength) {
      return;
    }

    const nextOffset =
      granularity === "word"
        ? getWordRightOffset(this.document.getText(), currentOffset)
        : currentOffset + 1;

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

  moveCursor(
    direction: CursorDirection,
    select?: boolean,
  ): void {
    const cursor = this.cursor;

    if (
      !select &&
      !cursor.isCollapsed() &&
      ["left", "right", "up", "down"].includes(direction)
    ) {
      if (direction === "left") {
        this.cursor = cursor.collapseToStart();
        return;
      }
      if (direction === "right") {
        this.cursor = cursor.collapseToEnd();
        return;
      }
      this.cursor = cursor.collapseToEnd();
    }

    const current = cursor.active;
    const offset = this.document.getOffsetAt(current);
    let newPos = current;

    switch (direction) {
      case "left":
        if (offset > 0) newPos = this.document.getPositionAt(offset - 1);
        break;

      case "right":
        if (offset < this.document.getLength())
          newPos = this.document.getPositionAt(offset + 1);
        break;

      case "up":
        if (current.line > 0) {
          const nextLineLength = this.document.getLineLength(current.line - 1);
          newPos = new Position(
            current.line - 1,
            Math.min(current.column, nextLineLength),
          );
        }
        break;

      case "down":
        if (current.line < this.document.getLineCount() - 1) {
          const nextLineLength = this.document.getLineLength(current.line + 1);
          newPos = new Position(
            current.line + 1,
            Math.min(current.column, nextLineLength),
          );
        }
        break;

      case "lineStart":
        newPos = new Position(current.line, 0);
        break;

      case "lineEnd":
        newPos = new Position(current.line, this.document.getLineLength(current.line));
        break;

      case "documentStart":
        newPos = new Position(0, 0);
        break;

      case "documentEnd": {
        const lastLine = this.document.getLineCount() - 1;
        newPos = new Position(lastLine, this.document.getLineLength(lastLine));
        break;
      }

      case "wordLeft":
        newPos = this.document.getPositionAt(
          getWordLeftOffset(this.document.getText(), offset)
        );
        break;

      case "wordRight":
        newPos = this.document.getPositionAt(
          getWordRightOffset(this.document.getText(), offset)
        );
        break;
    }

    if (select) {
      this.cursor = cursor.setActive(newPos);
    } else {
      this.cursor = cursor.moveTo(newPos);
    }
  }

  private selectAll(): void {
    const start = new Position(0, 0);
    const lastLine = this.document.getLineCount() - 1;
    const end = new Position(lastLine, this.document.getLineLength(lastLine));
    this.cursor = new Cursor(start, end);
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
    const result = this.history.undo();
    if (result && "cursorBefore" in result) {
      this.document.replace(result.undoRange, result.undoText);
      this.cursor = result.cursorBefore;
    }
  }

  private redo(): void {
    const result = this.history.redo();
    if (result && "cursorAfter" in result) {
      this.document.replace(result.doRange, result.doText);
      this.cursor = result.cursorAfter;
    }
  }

  execute(command: Command): void {
    switch (command.type) {
      case "insert_text":
        this.insert(command.text);
        break;

      case "delete_backward":
        this.deleteBackward(command.granularity);
        break;

      case "delete_forward":
        this.deleteForward(command.granularity);
        break;

      case "move_cursor":
        this.moveCursor(command.direction, command.select);
        break;

      case "move_cursor_to":
        this.setCursor(new Cursor(command.position));
        break;

      case "select_to":
        this.expandSelection(command.position);
        break;

      case "select_all":
        this.selectAll();
        break;

      case "undo":
        this.undo();
        break;

      case "redo":
        this.redo();
        break;
    }
    this.updateRelativeCursor();
    this.notifyListeners();
  }
}
