import { Range } from "@/core/position/range";
import type { Cursor } from "@/editor/cursor/cursor";

export interface EditOperation {
  doText: string;
  doRange: Range;
  undoText: string;
  undoRange: Range;
  cursorBefore: Cursor;
  cursorAfter: Cursor;
  isCharacterInsert: boolean;
}

export class HistoryManager {
  private undoStack: EditOperation[] = [];
  private redoStack: EditOperation[] = [];

  push(op: EditOperation): void {
    // Attempt to merge consecutive single-character inserts
    if (op.isCharacterInsert && this.undoStack.length > 0) {
      const prev = this.undoStack[this.undoStack.length - 1];
      if (
        prev.isCharacterInsert &&
        prev.cursorAfter.active.isEqual(op.cursorBefore.active) &&
        prev.doRange.start.line === op.doRange.start.line
      ) {
        // We can merge!
        const merged: EditOperation = {
          doText: prev.doText + op.doText,
          doRange: prev.doRange,
          undoText: prev.undoText + op.undoText, // Typically empty for inserts
          undoRange: new Range(prev.undoRange.start, op.undoRange.end),
          cursorBefore: prev.cursorBefore,
          cursorAfter: op.cursorAfter,
          isCharacterInsert: true,
        };
        this.undoStack[this.undoStack.length - 1] = merged;
        this.redoStack = [];
        return;
      }
    }

    this.undoStack.push(op);
    this.redoStack = [];
  }

  undo(): EditOperation | null {
    const op = this.undoStack.pop();
    if (op) {
      this.redoStack.push(op);
      return op;
    }
    return null;
  }

  redo(): EditOperation | null {
    const op = this.redoStack.pop();
    if (op) {
      this.undoStack.push(op);
      return op;
    }
    return null;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}
