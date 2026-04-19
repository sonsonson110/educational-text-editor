import { describe, it, expect } from "vitest";
import { EditorState } from "./editorState";
import { CollaborativeDocument } from "@/core/document/collaborativeDocument";
import { Cursor } from "@/editor/cursor/cursor";
import { Position } from "@/core/position/position";
import * as Y from "yjs";
import { YjsUndoManager } from "@/collaboration/yjsUndoManager";

const p = (line: number, col: number) => new Position(line, col);

describe("EditorState - Collaboration & Yjs", () => {
  it("injects IUndoRedoManager and undoes local changes", () => {
    const ydoc = new Y.Doc();
    const ytext = ydoc.getText("content");
    ytext.insert(0, "hello");

    const doc = new CollaborativeDocument(ytext);
    const cursor = new Cursor(p(0, 5));
    const undoManager = new YjsUndoManager(ytext);

    const editor = new EditorState(doc, cursor, undoManager, ydoc, ytext);

    // Insert text locally (EditorState command)
    editor.execute({ type: "insert_text", text: " world" });
    expect(editor.getLineContent(0)).toBe("hello world");

    // Undo should revert local change
    editor.execute({ type: "undo" });
    expect(editor.getLineContent(0)).toBe("hello");

    // Redo should re-apply local change
    editor.execute({ type: "redo" });
    expect(editor.getLineContent(0)).toBe("hello world");
  });

  it("maintains cursor position despite remote insertions before it", () => {
    const ydoc = new Y.Doc();
    const ytext = ydoc.getText("content");
    ytext.insert(0, "hello");

    const doc = new CollaborativeDocument(ytext);
    const cursor = new Cursor(p(0, 5));
    const editor = new EditorState(doc, cursor, undefined, ydoc, ytext);

    // Update relative cursor manually for test because it happens inside execute()
    // and here we are testing the initial cursor state which didn't go through execute().
    // Actually, we can just execute a move_cursor to initialize it.
    editor.execute({ type: "move_cursor", direction: "left" });
    // Cursor is now at "hell|o" (index 4)
    expect(editor.getCursor().active.isEqual(p(0, 4))).toBe(true);

    // Simulate remote insertion BEFORE the cursor
    // "remote" origin ensures it triggers the external listener in CollaborativeDocument
    ydoc.transact(() => {
      ytext.insert(0, "remote ");
    }, "remote");

    // After remote insertion, the text is "remote hello"
    expect(editor.getLineContent(0)).toBe("remote hello");

    // The cursor should have shifted by 7 characters (length of "remote ")
    // From index 4 to index 11 ("remote hell|o")
    expect(editor.getCursor().active.isEqual(p(0, 11))).toBe(true);
  });

  it("YjsUndoManager ignores remote changes", () => {
    const ydoc = new Y.Doc();
    const ytext = ydoc.getText("content");
    ytext.insert(0, "start");

    const doc = new CollaborativeDocument(ytext);
    const cursor = new Cursor(p(0, 5));
    const undoManager = new YjsUndoManager(ytext);
    const editor = new EditorState(doc, cursor, undoManager, ydoc, ytext);

    // Local edit
    editor.execute({ type: "insert_text", text: " local" });
    expect(editor.getLineContent(0)).toBe("start local");

    // Remote edit
    ydoc.transact(() => {
      ytext.insert(0, "remote ");
    }, "remote");
    expect(editor.getLineContent(0)).toBe("remote start local");

    // Undo should ONLY undo the local edit (" local"), leaving the remote edit intact
    editor.execute({ type: "undo" });
    expect(editor.getLineContent(0)).toBe("remote start");
  });
});
