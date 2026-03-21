// src/ui/EditorView.tsx
import { useEffect, useState } from "react";
import type { ViewModel } from "@/view/viewModel";
import { Line } from "./Line";
import { Cursor as CursorComponent } from "./Cursor";
import type { IEditorState } from "@/editor/editorState";
import { Position } from "@/core/position/position";
import { Cursor } from "@/editor/cursor/cursor";

interface Props {
  viewModel: ViewModel;
  editor: IEditorState;
}

export function EditorView({ viewModel, editor }: Props) {
  const [lines, setLines] = useState(viewModel.getVisibleLines());
  const [cursor, setCursor] = useState(viewModel.getCursorViewportPosition());

  // simple re-sync
  useEffect(() => {
    const update = () => {
      setLines(viewModel.getVisibleLines());
      setCursor(viewModel.getCursorViewportPosition());
    };

    update();

    // temporary: poll
    const interval = setInterval(update, 100);

    return () => clearInterval(interval);
  }, [viewModel]);

  return (
    <div className="editor">
      {lines.map((line) => (
        <Line key={line.lineNumber} line={line} />
      ))}

      {cursor && <CursorComponent position={cursor} />}
      <div className="flex gap-1">
        <button className="border" onClick={() => viewModel.scrollUp()}>
          scroll up
        </button>
        <button className="border" onClick={() => viewModel.scrollDown()}>
          scroll down
        </button>
        <button className="border" onClick={() => editor.insert("Hello")}>
          Insert text
        </button>
        <button
          className="border"
          onClick={() => {
            editor.setCursor(
              new Cursor(new Position(0, 0), new Position(0, 5)),
            );
            editor.delete();
          }}
        >
          Delete text
        </button>
      </div>
    </div>
  );
}
