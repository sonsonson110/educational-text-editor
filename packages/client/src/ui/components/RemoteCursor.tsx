import { LINE_HEIGHT } from "@/constants";
import { useEditorConfig } from "../EditorConfigContext";
import type { RemoteCursorView } from "@/collaboration/awareness";
import clsx from "clsx";

interface Props {
  remoteCursor: RemoteCursorView;
}

/**
 * Renders another user's cursor position and name label inside the editor viewport.
 *
 * The cursor bar and label background colour are set dynamically via inline
 * `style` (they depend on the remote user's assigned colour). All other
 * static layout/typography is expressed with Tailwind utility classes.
 */
export function RemoteCursor({ remoteCursor }: Props) {
  const { charWidth } = useEditorConfig();
  const { head, user } = remoteCursor;

  return (
    <div
      className={clsx(
        "remote-cursor",
        "absolute w-0.5 z-10 pointer-events-none transition-[top,left] duration-100",
      )}
      style={{
        top: head.line * LINE_HEIGHT,
        left: head.column * charWidth,
        height: LINE_HEIGHT,
        backgroundColor: user.color,
      }}
    >
      <div
        className={clsx(
          "remote-cursor-label",
          "absolute left-0 text-white text-[10px] px-1 py-0.5 rounded-sm whitespace-nowrap select-none",
        )}
        style={{
          top: -LINE_HEIGHT,
          backgroundColor: user.color,
        }}
      >
        {user.name}
      </div>
    </div>
  );
}
