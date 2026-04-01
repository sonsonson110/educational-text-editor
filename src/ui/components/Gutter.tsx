import { LINE_HEIGHT } from "@/constants";
import type { ViewLine } from "@/view/types";

interface Props {
  lines: ViewLine[];
  scrollTop: number;
  width: number | string;
  onLineNumberMouseDown: (e: React.MouseEvent, line: number) => void;
}

export function Gutter({
  lines,
  scrollTop,
  width,
  onLineNumberMouseDown,
}: Props) {
  return (
    <div className="gutter" style={{ width }}>
      <div style={{ transform: `translateY(-${scrollTop % LINE_HEIGHT}px)` }}>
        {lines.map((line) => (
          <div
            key={line.lineNumber}
            className="gutter-line"
            onMouseDown={(e) => onLineNumberMouseDown(e, line.lineNumber)}
          >
            {line.lineNumber + 1}
          </div>
        ))}
      </div>
    </div>
  );
}
