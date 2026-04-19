import { describe, it, expect } from "vitest";
import { Document } from "@/core/document/document";
import { Position } from "@/core/position/position";
import { Cursor } from "@/editor/cursor/cursor";
import { EditorState } from "@/editor/editorState";
import { HistoryManager } from "@/editor/history";
import { ViewModel } from "@/view/viewModel";
import { INITIAL_TEXT } from "@/constants";

/**
 * Tests that the solo-mode editor wiring produces a functioning
 * ViewModel — mirrors what `useSoloEditor` does, but without React hooks.
 */
describe("useSoloEditor (wiring logic)", () => {
  it("creates a ViewModel seeded with the initial text", () => {
    const doc = new Document(INITIAL_TEXT);
    const cursor = new Cursor(new Position(0, 0));
    const history = new HistoryManager();
    const editorState = new EditorState(doc, cursor, history);
    const vm = new ViewModel(editorState);

    expect(vm.getLineCount()).toBeGreaterThan(0);
    expect(vm.getLineContent(0)).toBe(INITIAL_TEXT.split("\n")[0]);
  });

  it("supports insert and undo without Yjs", () => {
    const doc = new Document("");
    const cursor = new Cursor(new Position(0, 0));
    const history = new HistoryManager();
    const editorState = new EditorState(doc, cursor, history);
    const vm = new ViewModel(editorState);

    vm.execute({ type: "insert_text", text: "hello" });
    expect(vm.getLineContent(0)).toBe("hello");

    vm.execute({ type: "undo" });
    expect(vm.getLineContent(0)).toBe("");
  });

  it("has cursor at document start", () => {
    const doc = new Document(INITIAL_TEXT);
    const cursor = new Cursor(new Position(0, 0));
    const history = new HistoryManager();
    const editorState = new EditorState(doc, cursor, history);
    const vm = new ViewModel(editorState);

    const cursorPos = vm.getCursorViewportPosition();
    expect(cursorPos.line).toBe(0);
    expect(cursorPos.column).toBe(0);
  });
});
