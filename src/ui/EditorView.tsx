import { mapKeyboardEvent } from "@/ui/inputHandler";
import type { IViewModel } from "@/view/viewModel";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEventHandler,
  type MouseEventHandler,
  type WheelEventHandler,
} from "react";
import { Cursor as CursorComponent } from "./components/Cursor";
import { Line } from "./components/Line";
import { Selection } from "./components/Selection";
import { LINE_HEIGHT } from "@/constants";
import { Position } from "@/core/position/position";
import { buildSelectionRects } from "@/ui/components/Selection";

interface Props {
  viewModel: IViewModel;
}

export function EditorView({ viewModel }: Props) {
  const [lines, setLines] = useState(viewModel.getVisibleLines());
  const [cursor, setCursor] = useState(viewModel.getCursorViewportPosition());
  const [selectionRects, setSelectionRects] = useState(
    buildSelectionRects(
      viewModel.getAnchorViewportPosition() ?? { line: 0, column: 0 },
      viewModel.getCursorViewportPosition() ?? { line: 0, column: 0 },
      (vpLine) =>
        viewModel.getLineContent(viewModel.getViewportStart() + vpLine).length,
    ),
  );

  const containerRef = useRef<HTMLDivElement>(null);
  // Calculate char width once and store it, to avoid expensive calculations on every render
  const charWidthRef = useRef<number>(null);

  const isDraggingRef = useRef(false);
  const didMoveRef = useRef(false);
  const scrollAccumulatorRef = useRef(0);

  // ---------------------------------------------------------------------------
  // Coordinate helper
  // Converts a MouseEvent into a clamped document Position.
  // ---------------------------------------------------------------------------

  const resolvePosition = useCallback(
    (clientX: number, clientY: number): Position | null => {
      const container = containerRef.current;
      if (!container) {
        return null;
      }

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

  const updateView = useCallback(() => {
    const nextLines = viewModel.getVisibleLines();
    const nextCursor = viewModel.getCursorViewportPosition();

    // Build selection rects in viewport-relative coordinates
    const anchorVp = viewModel.getAnchorViewportPosition();
    const activeVp = nextCursor;
    const vpStart = viewModel.getViewportStart();

    const nextRects =
      anchorVp && activeVp && !viewModel.isSelectionCollapsed()
        ? buildSelectionRects(
            anchorVp,
            activeVp,
            (vpLine) => viewModel.getLineContent(vpStart + vpLine).length,
          )
        : [];
    setLines(nextLines);
    setCursor(nextCursor);
    setSelectionRects(nextRects);
  }, [viewModel]);

  const handleWheel: WheelEventHandler<HTMLDivElement> = useCallback(
    (e) => {
      // Accumulate scroll delta to support smooth trackpad scrolling.
      // We scale the divisor. A standard Linux wheel detent is ~53px,
      // Windows is ~100px. Dividing by 50 ensures 1 Linux detent = ~1 line,
      // which feels much nicer than jumping by Math.trunc(53/20) = 2 lines.
      const PIXELS_PER_LINE = 50;
      const delta = Math.abs(e.deltaY);
      const scrollDirection = e.deltaY > 0 ? 'down' : 'up';
      scrollAccumulatorRef.current +=
        e.deltaMode === 1 ? delta * PIXELS_PER_LINE : delta;

      // Calculate how many full lines we can scroll
      const lines = Math.trunc(scrollAccumulatorRef.current / PIXELS_PER_LINE);

      if (lines !== 0) {
        if (scrollDirection === 'down') {
          viewModel.scrollDown(lines);
        } else {
          viewModel.scrollUp(lines);
        }

        // Subtract the scrolled amount
        scrollAccumulatorRef.current -= lines * PIXELS_PER_LINE;
        updateView();
      }
    },
    [viewModel, updateView],
  );

  const sync = useCallback(() => {
    viewModel.scrollToCursor();
    updateView();
  }, [viewModel, updateView]);

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
      onWheel={handleWheel}
    >
      <Selection rects={selectionRects} />

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
