import { describe, it, expect, vi } from "vitest";
import { ViewModel } from "./viewModel";
import type { IEditorState } from "@/editor/editorState";
import { Cursor } from "@/editor/cursor/cursor";
import { Position } from "@/core/position/position";

const p = (line: number, col: number) => new Position(line, col);

// ---------------------------------------------------------------------------
// Stub factory
// Builds a minimal IEditorState. Override any field per-test.
// ---------------------------------------------------------------------------

interface StubOptions {
  lineCount: number;
  cursorLine?: number;
  cursorCol?: number;
  maxLineLength?: number;
  overrides?: Partial<IEditorState>;
}

function makeStub({
  lineCount,
  cursorLine = 0,
  cursorCol = 0,
  maxLineLength = 80,
  overrides = {},
}: StubOptions): IEditorState {
  return {
    getCursor: () => new Cursor(p(cursorLine, cursorCol)),
    getLineCount: () => lineCount,
    getLineContent: (line: number) => `line${line}`,
    getMaxLineLength: () => maxLineLength,
    execute: vi.fn(),
    subscribe: vi.fn(() => () => {}),
    ...overrides,
  };
}

function makeVM(
  stub: IEditorState,
  startLine = 0,
  visibleCount = 5,
): ViewModel {
  return new ViewModel(stub, startLine, visibleCount);
}

describe("ViewModel", () => {
  // -------------------------------------------------------------------------
  // getViewportStart
  // -------------------------------------------------------------------------
  describe("getViewportStart", () => {
    it("returns startLine when document is long enough", () => {
      const vm = makeVM(makeStub({ lineCount: 100 }), 10, 20);
      expect(vm.getViewportStart()).toBe(10);
    });

    it("clamps to lineCount - visibleCount when startLine is too large", () => {
      const vm = makeVM(makeStub({ lineCount: 30 }), 20, 15);
      // lineCount - visibleCount = 30 - 15 = 15
      expect(vm.getViewportStart()).toBe(15);
    });

    it("does not return negative start even if lineCount < visibleCount", () => {
      const vm = makeVM(makeStub({ lineCount: 5 }), 0, 10);
      expect(vm.getViewportStart()).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // getViewportEnd
  // -------------------------------------------------------------------------
  describe("getViewportEnd", () => {
    it("returns startLine + visibleCount when document is long enough", () => {
      const vm = makeVM(makeStub({ lineCount: 100 }), 10, 20);
      expect(vm.getViewportEnd()).toBe(30);
    });

    it("clamps to lineCount when startLine + visibleCount exceeds lineCount", () => {
      const vm = makeVM(makeStub({ lineCount: 25 }), 20, 10);
      expect(vm.getViewportEnd()).toBe(25);
    });
  });

  // -------------------------------------------------------------------------
  // getVisibleLines
  // -------------------------------------------------------------------------

  describe("getVisibleLines", () => {
    it("returns visibleLineCount lines starting from startLine", () => {
      const vm = makeVM(makeStub({ lineCount: 10 }), 0, 5);
      const lines = vm.getVisibleLines();
      expect(lines).toHaveLength(5);
      expect(lines[0].lineNumber).toBe(0);
      expect(lines[4].lineNumber).toBe(4);
    });

    it("uses content from getLineContent for each line", () => {
      const vm = makeVM(makeStub({ lineCount: 10 }), 0, 3);
      const lines = vm.getVisibleLines();
      expect(lines[0].content).toBe("line0");
      expect(lines[2].content).toBe("line2");
    });

    it("returns fewer lines when near the end of the document", () => {
      const vm = makeVM(makeStub({ lineCount: 3 }), 0, 5);
      expect(vm.getVisibleLines()).toHaveLength(3);
    });

    it("starts from startLine when not at the beginning", () => {
      const vm = makeVM(makeStub({ lineCount: 10 }), 3, 3);
      const lines = vm.getVisibleLines();
      expect(lines[0].lineNumber).toBe(3);
      expect(lines[2].lineNumber).toBe(5);
    });

    it("clamps startLine so it never exceeds lineCount - visibleCount", () => {
      // 10 lines, 5 visible, startLine=8 → effective start = 5
      const vm = makeVM(makeStub({ lineCount: 10 }), 8, 5);
      const lines = vm.getVisibleLines();
      expect(lines[0].lineNumber).toBe(5);
    });
  });

  // -------------------------------------------------------------------------
  // scrollDown / scrollUp
  // -------------------------------------------------------------------------

  describe("scrollDown", () => {
    it("advances startLine by 1 by default", () => {
      const vm = makeVM(makeStub({ lineCount: 20 }), 0, 5);
      vm.scrollDown();
      expect(vm.getVisibleLines()[0].lineNumber).toBe(1);
    });

    it("advances startLine by the given amount", () => {
      const vm = makeVM(makeStub({ lineCount: 20 }), 0, 5);
      vm.scrollDown(3);
      expect(vm.getVisibleLines()[0].lineNumber).toBe(3);
    });

    it("clamps at the last possible startLine (lineCount - visibleCount)", () => {
      const vm = makeVM(makeStub({ lineCount: 10 }), 0, 5);
      vm.scrollDown(100);
      // max start = 10 - 5 = 5
      expect(vm.getVisibleLines()[0].lineNumber).toBe(5);
    });

    it("does not scroll past the end when document is smaller than viewport", () => {
      const vm = makeVM(makeStub({ lineCount: 3 }), 0, 5);
      vm.scrollDown(10);
      expect(vm.getVisibleLines()[0].lineNumber).toBe(0);
    });
  });

  describe("scrollUp", () => {
    it("decrements startLine by 1 by default", () => {
      const vm = makeVM(makeStub({ lineCount: 20 }), 5, 5);
      vm.scrollUp();
      expect(vm.getVisibleLines()[0].lineNumber).toBe(4);
    });

    it("decrements startLine by the given amount", () => {
      const vm = makeVM(makeStub({ lineCount: 20 }), 5, 5);
      vm.scrollUp(3);
      expect(vm.getVisibleLines()[0].lineNumber).toBe(2);
    });

    it("clamps at startLine 0", () => {
      const vm = makeVM(makeStub({ lineCount: 20 }), 2, 5);
      vm.scrollUp(100);
      expect(vm.getVisibleLines()[0].lineNumber).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // isCursorVisible
  // -------------------------------------------------------------------------

  describe("isCursorVisible", () => {
    it("returns true when cursor is on the first visible line", () => {
      const vm = makeVM(makeStub({ lineCount: 10, cursorLine: 0 }), 0, 5);
      expect(vm.isCursorVisible()).toBe(true);
    });

    it("returns true when cursor is on the last visible line", () => {
      const vm = makeVM(makeStub({ lineCount: 10, cursorLine: 4 }), 0, 5);
      expect(vm.isCursorVisible()).toBe(true);
    });

    it("returns false when cursor is above the viewport", () => {
      const vm = makeVM(makeStub({ lineCount: 10, cursorLine: 0 }), 3, 5);
      expect(vm.isCursorVisible()).toBe(false);
    });

    it("returns false when cursor is below the viewport", () => {
      const vm = makeVM(makeStub({ lineCount: 10, cursorLine: 9 }), 0, 5);
      expect(vm.isCursorVisible()).toBe(false);
    });

    it("returns false when cursor is exactly at viewport end (exclusive)", () => {
      // viewport 0-4 (end is exclusive at 5), cursor on line 5
      const vm = makeVM(makeStub({ lineCount: 10, cursorLine: 5 }), 0, 5);
      expect(vm.isCursorVisible()).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // getCursorViewportPosition
  // -------------------------------------------------------------------------

  describe("getCursorViewportPosition", () => {
    it("returns unclipped relative line when cursor is not visible", () => {
      const vm = makeVM(makeStub({ lineCount: 10, cursorLine: 9 }), 0, 5);
      const pos = vm.getCursorViewportPosition();
      expect(pos.line).toBe(9);
      expect(pos.column).toBe(0);
    });

    it("returns relative line 0 when cursor is on first visible line", () => {
      const vm = makeVM(
        makeStub({ lineCount: 10, cursorLine: 0, cursorCol: 3 }),
        0,
        5,
      );
      const pos = vm.getCursorViewportPosition();
      expect(pos).not.toBeNull();
      expect(pos!.line).toBe(0);
      expect(pos!.column).toBe(3);
    });

    it("returns correct relative line when viewport is scrolled", () => {
      // cursor on document line 7, viewport starts at 5 → relative line 2
      const vm = makeVM(
        makeStub({ lineCount: 20, cursorLine: 7, cursorCol: 4 }),
        5,
        5,
      );
      const pos = vm.getCursorViewportPosition();
      expect(pos).not.toBeNull();
      expect(pos!.line).toBe(2);
      expect(pos!.column).toBe(4);
    });

    it("returns relative line for last visible line", () => {
      // cursor on line 4, viewport 0-4 (5 lines) → relative line 4
      const vm = makeVM(makeStub({ lineCount: 10, cursorLine: 4 }), 0, 5);
      const pos = vm.getCursorViewportPosition();
      expect(pos!.line).toBe(4);
    });
  });

  // -------------------------------------------------------------------------
  // getAnchorViewportPosition
  // -------------------------------------------------------------------------

  describe("getAnchorViewportPosition", () => {
    it("returns unclipped relative line when anchor is not visible", () => {
      const vm = makeVM(makeStub({ lineCount: 10, cursorLine: 9 }), 0, 5);
      const pos = vm.getAnchorViewportPosition();
      expect(pos.line).toBe(9);
      expect(pos.column).toBe(0);
    });

    it("returns relative line 0 when anchor is on first visible line", () => {
      const vm = makeVM(
        makeStub({ lineCount: 10, cursorLine: 0, cursorCol: 3 }),
        0,
        5,
      );
      const pos = vm.getAnchorViewportPosition();
      expect(pos).not.toBeNull();
      expect(pos!.line).toBe(0);
      expect(pos!.column).toBe(3);
    });

    it("returns correct relative line when viewport is scrolled", () => {
      // anchor on document line 7, viewport starts at 5 → relative line 2
      const vm = makeVM(
        makeStub({ lineCount: 20, cursorLine: 7, cursorCol: 4 }),
        5,
        5,
      );
      const pos = vm.getAnchorViewportPosition();
      expect(pos).not.toBeNull();
      expect(pos!.line).toBe(2);
      expect(pos!.column).toBe(4);
    });

    it("returns relative line for last visible line", () => {
      // anchor on line 4, viewport 0-4 (5 lines) → relative line 4
      const vm = makeVM(makeStub({ lineCount: 10, cursorLine: 4 }), 0, 5);
      const pos = vm.getAnchorViewportPosition();
      expect(pos!.line).toBe(4);
    });
  });

  // -------------------------------------------------------------------------
  // scrollToCursor
  // -------------------------------------------------------------------------

  describe("scrollToCursor", () => {
    it("is a no-op when cursor is already visible", () => {
      const vm = makeVM(makeStub({ lineCount: 10, cursorLine: 2 }), 0, 5);
      vm.scrollToCursor();
      expect(vm.getVisibleLines()[0].lineNumber).toBe(0);
    });

    it("scrolls up when cursor is above the viewport", () => {
      const vm = makeVM(makeStub({ lineCount: 20, cursorLine: 1 }), 5, 5);
      vm.scrollToCursor();
      expect(vm.getVisibleLines()[0].lineNumber).toBe(1);
    });

    it("scrolls down when cursor is below the viewport", () => {
      const vm = makeVM(makeStub({ lineCount: 20, cursorLine: 12 }), 0, 5);
      vm.scrollToCursor();
      // new startLine = 12 - 5 + 1 = 8
      expect(vm.getVisibleLines()[0].lineNumber).toBe(8);
    });

    it("after scrolling, cursor is visible", () => {
      const vm = makeVM(makeStub({ lineCount: 20, cursorLine: 15 }), 0, 5);
      vm.scrollToCursor();
      expect(vm.isCursorVisible()).toBe(true);
    });

    it("handles cursor exactly at the boundary below viewport", () => {
      // viewport 0-4, cursor on line 5 (just outside)
      const vm = makeVM(makeStub({ lineCount: 20, cursorLine: 5 }), 0, 5);
      vm.scrollToCursor();
      expect(vm.isCursorVisible()).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // subscribe — delegates to editor
  // -------------------------------------------------------------------------

  describe("subscribe", () => {
    it("delegates to editor.subscribe and returns the unsubscribe fn", () => {
      const unsub = vi.fn();
      const stub = makeStub({
        lineCount: 10,
        overrides: { subscribe: vi.fn(() => unsub) },
      });
      const vm = makeVM(stub);
      const callback = vi.fn();
      const returned = vm.subscribe(callback);

      expect(stub.subscribe).toHaveBeenCalledWith(callback);
      expect(returned).toBe(unsub);
    });
  });

  // -------------------------------------------------------------------------
  // execute — delegates to editor
  // -------------------------------------------------------------------------

  describe("execute", () => {
    it("delegates to editor.execute with the exact command", () => {
      const stub = makeStub({ lineCount: 10 });
      const vm = makeVM(stub);
      const cmd = { type: "delete_backward" as const };
      vm.execute(cmd);
      expect(stub.execute).toHaveBeenCalledWith(cmd);
    });

    it("delegates insert_text command", () => {
      const stub = makeStub({ lineCount: 10 });
      const vm = makeVM(stub);
      const cmd = { type: "insert_text" as const, text: "hello" };
      vm.execute(cmd);
      expect(stub.execute).toHaveBeenCalledWith(cmd);
    });
  });

  // -------------------------------------------------------------------------
  // getVisibleLineCount
  // -------------------------------------------------------------------------

  describe("getVisibleLineCount", () => {
    it("returns the value passed at construction", () => {
      const vm = makeVM(makeStub({ lineCount: 20 }), 0, 5);
      expect(vm.getVisibleLineCount()).toBe(5);
    });
  });

  // -------------------------------------------------------------------------
  // setVisibleLineCount
  // -------------------------------------------------------------------------

  describe("setVisibleLineCount", () => {
    it("updates the visible line count", () => {
      const vm = makeVM(makeStub({ lineCount: 20 }), 0, 5);
      vm.setVisibleLineCount(10);
      expect(vm.getVisibleLineCount()).toBe(10);
    });

    it("clamps count to at least 1", () => {
      const vm = makeVM(makeStub({ lineCount: 20 }), 0, 5);
      vm.setVisibleLineCount(0);
      expect(vm.getVisibleLineCount()).toBe(1);
      vm.setVisibleLineCount(-5);
      expect(vm.getVisibleLineCount()).toBe(1);
    });

    it("clamps startLine when shrinking the viewport would overshoot the document", () => {
      // 10 lines, viewport starts at 7, showing 3 lines (7,8,9)
      const vm = makeVM(makeStub({ lineCount: 10 }), 7, 3);
      // Grow viewport to 5 → max start = 10-5=5, so startLine clamps to 5
      vm.setVisibleLineCount(5);
      expect(vm.getVisibleLines()[0].lineNumber).toBe(5);
    });

    it("does not change startLine when growing the viewport with room", () => {
      // 20 lines, start at 5, showing 5 lines
      const vm = makeVM(makeStub({ lineCount: 20 }), 5, 5);
      vm.setVisibleLineCount(10);
      expect(vm.getVisibleLines()[0].lineNumber).toBe(5);
    });

    it("correctly shows more lines after growing the viewport", () => {
      const vm = makeVM(makeStub({ lineCount: 20 }), 0, 5);
      expect(vm.getVisibleLines()).toHaveLength(5);
      vm.setVisibleLineCount(10);
      expect(vm.getVisibleLines()).toHaveLength(10);
    });
  });

  // -------------------------------------------------------------------------
  // Horizontal scrolling — getScrollX, scrollLeft, scrollRight
  // -------------------------------------------------------------------------

  describe("getScrollX", () => {
    it("returns 0 initially", () => {
      const vm = makeVM(makeStub({ lineCount: 10 }), 0, 5);
      expect(vm.getScrollX()).toBe(0);
    });
  });

  describe("scrollRight", () => {
    it("increments scrollX by 1 by default", () => {
      const vm = makeVM(makeStub({ lineCount: 10, maxLineLength: 100 }), 0, 5);
      vm.scrollRight();
      expect(vm.getScrollX()).toBe(1);
    });

    it("increments scrollX by the given amount", () => {
      const vm = makeVM(makeStub({ lineCount: 10, maxLineLength: 100 }), 0, 5);
      vm.scrollRight(5);
      expect(vm.getScrollX()).toBe(5);
    });

    it("clamps at maxLineLength - visibleColumnCount + PADDING", () => {
      // maxLineLength=50, visibleColumnCount=80(default), PADDING=3
      // maxScrollX = max(50 - 80 + 3, 0) = 0
      const vm = makeVM(makeStub({ lineCount: 10, maxLineLength: 50 }), 0, 5);
      vm.scrollRight(100);
      expect(vm.getScrollX()).toBe(0);
    });

    it("clamps correctly when maxLineLength exceeds visibleColumnCount", () => {
      // maxLineLength=100, visibleColumnCount=80(default), PADDING=3
      // maxScrollX = 100 - 80 + 3 = 23
      const vm = makeVM(makeStub({ lineCount: 10, maxLineLength: 100 }), 0, 5);
      vm.scrollRight(10000);
      expect(vm.getScrollX()).toBe(23);
    });

    it("clamps with custom visibleColumnCount", () => {
      // maxLineLength=30, visibleColumnCount=20, PADDING=3
      // maxScrollX = 30 - 20 + 3 = 13
      const vm = makeVM(makeStub({ lineCount: 10, maxLineLength: 30 }), 0, 5);
      vm.setVisibleColumnCount(20);
      vm.scrollRight(100);
      expect(vm.getScrollX()).toBe(13);
    });
  });

  describe("scrollLeft", () => {
    it("decrements scrollX by 1 by default", () => {
      const vm = makeVM(makeStub({ lineCount: 10, maxLineLength: 100 }), 0, 5);
      vm.scrollRight(5);
      vm.scrollLeft();
      expect(vm.getScrollX()).toBe(4);
    });

    it("decrements scrollX by the given amount", () => {
      const vm = makeVM(makeStub({ lineCount: 10, maxLineLength: 100 }), 0, 5);
      vm.scrollRight(10);
      vm.scrollLeft(3);
      expect(vm.getScrollX()).toBe(7);
    });

    it("clamps at 0", () => {
      const vm = makeVM(makeStub({ lineCount: 10 }), 0, 5);
      vm.scrollRight(2);
      vm.scrollLeft(100);
      expect(vm.getScrollX()).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // setVisibleColumnCount / getVisibleColumnCount
  // -------------------------------------------------------------------------

  describe("setVisibleColumnCount", () => {
    it("updates the visible column count", () => {
      const vm = makeVM(makeStub({ lineCount: 10 }), 0, 5);
      vm.setVisibleColumnCount(120);
      expect(vm.getVisibleColumnCount()).toBe(120);
    });

    it("clamps to at least 1", () => {
      const vm = makeVM(makeStub({ lineCount: 10 }), 0, 5);
      vm.setVisibleColumnCount(0);
      expect(vm.getVisibleColumnCount()).toBe(1);
      vm.setVisibleColumnCount(-10);
      expect(vm.getVisibleColumnCount()).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // scrollToCursor — horizontal behavior
  // -------------------------------------------------------------------------

  describe("scrollToCursor (horizontal)", () => {
    it("is a no-op when cursor column is within visible range", () => {
      const vm = makeVM(makeStub({ lineCount: 10, cursorCol: 5 }), 0, 5);
      vm.setVisibleColumnCount(80);
      vm.scrollToCursor();
      expect(vm.getScrollX()).toBe(0);
    });

    it("scrolls right when cursor is past the right edge", () => {
      const vm = makeVM(makeStub({ lineCount: 10, cursorCol: 90, maxLineLength: 200 }), 0, 5);
      vm.setVisibleColumnCount(80);
      vm.scrollToCursor();
      // scrollX = 90 - 80 + 1 = 11
      expect(vm.getScrollX()).toBe(11);
    });

    it("scrolls left when cursor is before the left edge", () => {
      const vm = makeVM(makeStub({ lineCount: 10, cursorCol: 3 }), 0, 5);
      vm.setVisibleColumnCount(80);
      vm.scrollRight(10); // scrollX = 10
      vm.scrollToCursor();
      // cursor at col 3 < scrollX 10 → scrollX = 3
      expect(vm.getScrollX()).toBe(3);
    });

    it("after scrolling, cursor column is within visible range", () => {
      const vm = makeVM(makeStub({ lineCount: 10, cursorCol: 100, maxLineLength: 200 }), 0, 5);
      vm.setVisibleColumnCount(40);
      vm.scrollToCursor();
      const scrollX = vm.getScrollX();
      expect(100).toBeGreaterThanOrEqual(scrollX);
      expect(100).toBeLessThan(scrollX + 40);
    });
  });

  // -------------------------------------------------------------------------
  // scrollX re-clamping after document changes
  // -------------------------------------------------------------------------

  describe("scrollX re-clamping", () => {
    it("getVisibleLines re-clamps scrollX when maxLineLength shrinks", () => {
      let maxLen = 100;
      const stub = makeStub({
        lineCount: 10,
        maxLineLength: maxLen,
        overrides: {
          getMaxLineLength: () => maxLen,
        },
      });
      const vm = makeVM(stub, 0, 5);
      vm.setVisibleColumnCount(80);
      // maxScrollX = 100 - 80 + 3 = 23
      vm.scrollRight(20); // scrollX = 20, within bounds
      expect(vm.getScrollX()).toBe(20);

      // Simulate the longest line being deleted
      maxLen = 30;
      // maxScrollX = max(30 - 80 + 3, 0) = 0
      vm.getVisibleLines(); // triggers re-clamp
      expect(vm.getScrollX()).toBe(0);
    });

    it("getVisibleLines re-clamps scrollX to new maxScrollX, not 0", () => {
      let maxLen = 100;
      const stub = makeStub({
        lineCount: 10,
        maxLineLength: maxLen,
        overrides: {
          getMaxLineLength: () => maxLen,
        },
      });
      const vm = makeVM(stub, 0, 5);
      vm.setVisibleColumnCount(40);
      // maxScrollX = 100 - 40 + 3 = 63
      vm.scrollRight(50); // scrollX = 50
      expect(vm.getScrollX()).toBe(50);

      // Shrink maxLineLength so new maxScrollX = 60 - 40 + 3 = 23
      maxLen = 60;
      vm.getVisibleLines();
      expect(vm.getScrollX()).toBe(23);
    });
  });
});
