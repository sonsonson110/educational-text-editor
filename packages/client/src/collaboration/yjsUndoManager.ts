import * as Y from "yjs";
import type { IUndoRedoManager } from "@/editor/history";

/**
 * Wraps `Y.UndoManager` behind the `IUndoRedoManager` interface.
 *
 * Configured to only track operations with origin `'local'`, so undo/redo
 * applies exclusively to the current user's edits and ignores remote changes.
 */
export class YjsUndoManager implements IUndoRedoManager {
  private undoManager: Y.UndoManager;

  constructor(yText: Y.Text) {
    this.undoManager = new Y.UndoManager(yText, {
      trackedOrigins: new Set(["local"]),
    });
  }

  undo(): void {
    this.undoManager.undo();
  }

  redo(): void {
    this.undoManager.redo();
  }

  clear(): void {
    this.undoManager.clear();
  }

  /**
   * No-op — Yjs automatically captures edits via its transaction observer.
   * Satisfies the `IUndoRedoManager` contract so `EditorState` can call
   * `push()` uniformly regardless of which undo manager is active.
   */
  push(): void {
  }
}
