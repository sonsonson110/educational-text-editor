import { mapKeyboardEvent } from "@/ui/inputHandler";
import type { IViewModel } from "@/view/viewModel";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEventHandler,
  type MouseEventHandler,
} from "react";
import { Cursor as CursorComponent } from "./Cursor";
import { Line } from "./Line";
import { LINE_HEIGHT } from "@/constants";
import { Position } from "@/core/position/position";

interface Props {
  viewModel: IViewModel;
}

export function EditorView({ viewModel }: Props) {
  const [lines, setLines] = useState(viewModel.getVisibleLines());
  const [cursor, setCursor] = useState(viewModel.getCursorViewportPosition());

  const containerRef = useRef<HTMLDivElement>(null);
  // Calculate char width once and store it, to avoid expensive calculations on every render
  const charWidthRef = useRef<number>(null);

  const isDraggingRef = useRef(false);
  const didMoveRef = useRef(false);

  // ---------------------------------------------------------------------------
  // Coordinate helper
  // Converts a MouseEvent into a clamped document Position.
  // ---------------------------------------------------------------------------

  const resolvePosition = useCallback(
    (clientX: number, clientY: number): Position | null => {
      const container = containerRef.current;
      if (!container) return null;

      if (charWidthRef.current === null) {
        charWidthRef.current = measureCharWidth(container);
      }
      const charWidth = charWidthRef.current;
      const rect = container.getBoundingClientRect();

      const relativeY = clientY - rect.top;
      const clickedRelativeLine = Math.floor(relativeY / LINE_HEIGHT);
      const absoluteLine = viewModel.getViewportStart() + clickedRelativeLine;
      const clampedLine = Math.max(
        0,
        Math.min(absoluteLine, viewModel.getLineCount() - 1),
      );

      const relativeX = clientX - rect.left;
      const clickedColumn = Math.round(relativeX / charWidth);
      const lineLength = viewModel.getLineContent(clampedLine).length;
      const clampedColumn = Math.max(0, Math.min(clickedColumn, lineLength));

      return new Position(clampedLine, clampedColumn);
    },
    [viewModel],
  );

  // ---------------------------------------------------------------------------
  // Keyboard
  // ---------------------------------------------------------------------------

  const handleKeyDown: KeyboardEventHandler<HTMLDivElement> = (e) => {
    const command = mapKeyboardEvent(e);
    if (command) {
      viewModel.execute(command);
      e.preventDefault();
    }
  };

  // ---------------------------------------------------------------------------
  // Mouse drag → text selection
  //
  // Flow:
  //   mousedown  — place cursor at click position (collapsed), mark drag start
  //   mousemove  — if dragging, fire select_to so the selection extends live
  //   mouseup    — end drag, clean up window listeners
  //
  // mousemove and mouseup are attached to window so the drag keeps working
  // even when the pointer leaves the editor div.
  // ---------------------------------------------------------------------------

  const handleMouseDown: MouseEventHandler<HTMLDivElement> = (e) => {
    // Only handle primary button (left click)
    if (e.button !== 0) {
      return;
    }

    const position = resolvePosition(e.clientX, e.clientY);
    if (!position) {
      return;
    }

    // Place a collapsed cursor at the click position — this becomes the anchor
    viewModel.execute({ type: "move_cursor_to", position });

    isDraggingRef.current = true;
    didMoveRef.current = false;

    const handleWindowMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) {
        return;
      }

      const movePosition = resolvePosition(
        moveEvent.clientX,
        moveEvent.clientY,
      );
      if (!movePosition) {
        return;
      }

      didMoveRef.current = true;
      viewModel.execute({ type: "select_to", position: movePosition });
    };

    const handleWindowMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };

    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);

    containerRef.current?.focus();
    // Prevent the browser from triggering its own text selection UI
    e.preventDefault();
  };

  const sync = useCallback(() => {
    viewModel.scrollToCursor();
    setLines(viewModel.getVisibleLines());
    setCursor(viewModel.getCursorViewportPosition());
  }, [viewModel]);

  useEffect(() => {
    sync();
    return viewModel.subscribe(sync);
  }, [viewModel, sync]);

  return (
    <div
      ref={containerRef}
      className="editor border border-white"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseDown={handleMouseDown}
    >
      {lines.map((line) => (
        <Line key={line.lineNumber} line={line} />
      ))}

      {cursor && <CursorComponent position={cursor} />}
    </div>
  );
}

/**
 * Measures the pixel width of a single character in the editor's monospace
 * font using an offscreen canvas. Called once and cached.
 */
function measureCharWidth(element: HTMLElement): number {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return 8; // safe fallback
  }

  const style = window.getComputedStyle(element);
  ctx.font = `${style.fontSize} ${style.fontFamily}`;
  return ctx.measureText("M").width;
}
